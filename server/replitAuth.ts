import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 90 * 60 * 1000; // 90 minutes max session time
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  // Generate session secret if not provided (for deployment compatibility)
  const sessionSecret = process.env.SESSION_SECRET || `fallback-secret-${process.env.REPL_ID || 'development'}`;
  
  return session({
    secret: sessionSecret,
    store: sessionStore,
    resave: true, // Update session on each request to track activity
    saveUninitialized: false,
    rolling: true, // Reset expiration on activity
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Only secure in production
      maxAge: sessionTtl,
      sameSite: 'lax', // Better compatibility across environments
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // DISABLED: Replit Auth login route - using username/password auth instead
  // app.get("/api/login", (req: any, res, next) => {
  //   // Store redirect parameter in session for post-login redirect
  //   if (req.query.redirect) {
  //     req.session.postLoginRedirect = decodeURIComponent(req.query.redirect as string);
  //   }
  //   
  //   passport.authenticate(`replitauth:${req.hostname}`, {
  //     prompt: "login consent",
  //     scope: ["openid", "email", "profile", "offline_access"],
  //   })(req, res, next);
  // });

  // DISABLED: Replit Auth callback route - using username/password auth instead
  // app.get("/api/callback", (req: any, res, next) => {
  //   passport.authenticate(`replitauth:${req.hostname}`, {
  //     failureRedirect: "/api/login",
  //   })(req, res, (err: any) => {
  //     if (err) {
  //       return next(err);
  //     }
  //     
  //     // Check for stored redirect URL
  //     const redirectUrl = req.session.postLoginRedirect || "/";
  //     delete req.session.postLoginRedirect; // Clear the stored redirect
  //     
  //     res.redirect(redirectUrl);
  //   });
  // });

  // DISABLED: Replit Auth logout route - using username/password auth instead
  // app.get("/api/logout", (req, res) => {
  //   req.logout(() => {
  //     res.redirect(
  //       client.buildEndSessionUrl(config, {
  //         client_id: process.env.REPL_ID!,
  //         post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
  //       }).href
  //     );
  //   });
  // });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user || !user.expires_at) {
    console.log('Authentication failed:', {
      isAuthenticated: req.isAuthenticated(),
      hasUser: !!user,
      hasExpiresAt: user?.expires_at,
      sessionId: req.sessionID,
      hostname: req.hostname
    });
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

export const requireTwoFactor: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user?.claims?.sub) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Skip 2FA check for authentication and 2FA management endpoints
  const skip2FACheck = [
    '/api/auth/',
    '/api/login',
    '/api/logout',
    '/api/callback'
  ];

  if (skip2FACheck.some(path => req.originalUrl.startsWith(path))) {
    return next();
  }

  try {
    const is2FAEnabled = await storage.isTwoFactorEnabled(user.claims.sub);
    
    if (!is2FAEnabled) {
      return res.status(403).json({ 
        message: "Two-factor authentication is required",
        requiresSetup: true 
      });
    }

    return next();
  } catch (error) {
    console.error('Error checking 2FA status:', error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
