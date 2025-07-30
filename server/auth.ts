import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { TwoFactorService } from "./twoFactorService";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(12);
  return await bcrypt.hash(password, salt);
}

async function comparePasswords(supplied: string, stored: string) {
  return await bcrypt.compare(supplied, stored);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "default-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 90 * 60 * 1000, // 90 minutes
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
      try {
        // Try to find user by email first, then by username as fallback
        let user = await storage.getUserByEmail(email);
        if (!user) {
          user = await storage.getUserByUsername(email);
        }
        
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Invalid email or password" });
        }
        if (!user.isActive) {
          return done(null, false, { message: "Account is disabled" });
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Register new user
  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, password, email, firstName, lastName, invitationCode } = req.body;

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Check if email already exists
      if (email) {
        const existingEmailUser = await storage.getUserByEmail(email);
        if (existingEmailUser) {
          return res.status(400).json({ message: "Email already registered" });
        }
      }

      // If invitation code provided, validate it
      let invitation = null;
      if (invitationCode) {
        invitation = await storage.getUserInvitationByCode(invitationCode);
        if (!invitation) {
          return res.status(400).json({ message: "Invalid invitation code" });
        }
        if (invitation.status !== "pending") {
          return res.status(400).json({ message: "Invitation has already been used or expired" });
        }
        if (new Date() > new Date(invitation.expiresAt)) {
          return res.status(400).json({ message: "Invitation has expired" });
        }
        if (invitation.email !== email) {
          return res.status(400).json({ message: "Email does not match invitation" });
        }
      }

      // Generate 2FA setup data (mandatory for all new users)
      const twoFactorSetup = await TwoFactorService.generateSetup(email || username);
      const qrCodeDataUrl = await TwoFactorService.generateQRCode(twoFactorSetup.qrCodeUrl);

      // Create user with 2FA setup
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        email,
        firstName,
        lastName,
        accessLevel: invitation?.accessLevel || "team_member",
        isActive: true,
        invitedBy: invitation?.invitedBy,
        invitedAt: invitation ? new Date() : undefined,
        twoFactorSecret: twoFactorSetup.secret,
        twoFactorEnabled: false, // Will be enabled after verification
        backupCodes: JSON.stringify(twoFactorSetup.backupCodes)
      });

      // If this was an invitation, mark it as accepted and create team member contact
      if (invitation) {
        await storage.updateUserInvitation(invitation.id, { 
          status: "accepted",
          acceptedAt: new Date() 
        });

        // Auto-configure email settings if possible
        if (email) {
          await storage.configureAutoEmailSettings(user.id, email);
        }

        // Create team member contact record
        await storage.createContact({
          firstName,
          lastName,
          personalEmail: email,
          contactType: "team_member",
          status: "active",
        });
      }

      // Return 2FA setup data for mandatory configuration
      res.status(201).json({
        message: "User registered successfully - 2FA setup required",
        userId: user.id,
        requiresTwoFactorSetup: true,
        twoFactorSetup: {
          qrCodeDataUrl: qrCodeDataUrl,
          manualEntryKey: twoFactorSetup.manualEntryKey,
          backupCodes: twoFactorSetup.backupCodes
        }
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Verify 2FA setup for new registration (no auth required)
  app.post("/api/register/2fa/verify", async (req, res) => {
    try {
      const { userId, token } = req.body;

      if (!userId || !token) {
        return res.status(400).json({ message: "User ID and verification code are required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.twoFactorSecret) {
        return res.status(400).json({ message: "2FA not set up for this user" });
      }

      // Verify the token
      const isValid = TwoFactorService.verifyToken(token, user.twoFactorSecret);
      
      if (!isValid) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      // Enable 2FA for the user
      await storage.updateUser(userId, {
        twoFactorEnabled: true
      });

      res.json({ 
        success: true,
        message: "2FA setup completed successfully" 
      });
    } catch (error) {
      console.error("2FA registration verification error:", error);
      res.status(500).json({ message: "2FA verification failed" });
    }
  });

  // Login user (Step 1: Username/Password)
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: "Login failed" });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      
      // 2FA is mandatory for all users
      if (!user.twoFactorEnabled) {
        return res.status(403).json({ 
          message: "Two-factor authentication setup required. Please contact administrator.",
          requiresSetup: true
        });
      }
      
      // Don't log the user in yet, require 2FA verification
      // Store user ID in session temporarily for 2FA verification
      req.session.pendingUserId = user.id;
      return res.json({ 
        requiresTwoFactor: true,
        message: "Two-factor authentication required"
      });
    })(req, res, next);
  });

  // Get QR code for pending login session (for users who lost their authenticator)
  app.post("/api/login/2fa/get-qr", async (req, res) => {
    try {
      const pendingUserId = req.session.pendingUserId;

      if (!pendingUserId) {
        return res.status(400).json({ message: "No pending login session" });
      }

      const user = await storage.getUser(pendingUserId);
      if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
        return res.status(400).json({ message: "Invalid session or 2FA not properly configured" });
      }

      // Generate QR code for existing secret
      const { TwoFactorService } = await import('./twoFactorService');
      const userEmail = user.email || user.username;
      const qrCodeUrl = `otpauth://totp/ClientHub%20CRM:${encodeURIComponent(userEmail)}?secret=${user.twoFactorSecret}&issuer=ClientHub%20CRM`;
      const qrCodeDataUrl = await TwoFactorService.generateQRCode(qrCodeUrl);

      res.json({
        qrCodeDataUrl,
        manualEntryKey: user.twoFactorSecret
      });
    } catch (error) {
      console.error("Get QR code error:", error);
      res.status(500).json({ message: "Failed to generate QR code" });
    }
  });

  // Login Step 2: 2FA Verification
  app.post("/api/login/2fa", async (req, res, next) => {
    try {
      const { token, backupCode } = req.body;
      const pendingUserId = req.session.pendingUserId;

      if (!pendingUserId) {
        return res.status(400).json({ message: "No pending login session" });
      }

      if (!token && !backupCode) {
        return res.status(400).json({ message: "Verification code or backup code is required" });
      }

      const user = await storage.getUser(pendingUserId);
      if (!user || !user.twoFactorEnabled) {
        return res.status(400).json({ message: "Invalid session" });
      }

      const { TwoFactorService } = await import('./twoFactorService');
      let isValid = false;
      let updatedBackupCodes = null;

      // Verify TOTP token
      if (token && user.twoFactorSecret) {
        isValid = TwoFactorService.verifyToken(token, user.twoFactorSecret);
      }

      // If token failed or not provided, try backup code
      if (!isValid && backupCode && user.backupCodes) {
        const result = TwoFactorService.verifyBackupCode(backupCode, user.backupCodes as any[]);
        isValid = result.valid;
        if (result.valid && result.updatedCodes) {
          updatedBackupCodes = result.updatedCodes;
        }
      }

      if (!isValid) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      // Update backup codes if one was used
      if (updatedBackupCodes) {
        await storage.update2FABackupCodes(user.id, updatedBackupCodes);
      }

      // Clear pending session and log user in
      delete req.session.pendingUserId;
      
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("2FA login session error:", loginErr);
          return res.status(500).json({ message: "Login failed" });
        }
        res.json({
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          accessLevel: user.accessLevel,
          isActive: user.isActive,
        });
      });
    } catch (error) {
      console.error("2FA login error:", error);
      res.status(500).json({ message: "2FA verification failed" });
    }
  });

  // Logout user
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.json({ message: "Logged out successfully" });
    });
  });

  // Get current user
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json({
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      accessLevel: req.user.accessLevel,
      isActive: req.user.isActive,
    });
  });

  // Password reset request
  app.post('/api/forgot-password', async (req, res) => {
    try {
      const { username } = req.body;
      
      // Find user by username or email
      const user = await storage.getUserByUsername(username) || 
                   await storage.getUserByEmail(username);
      
      if (!user) {
        // Don't reveal if user exists or not for security
        return res.json({ message: "If an account exists, reset instructions will be sent" });
      }

      // Generate reset token
      const resetToken = randomBytes(32).toString('hex');
      const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

      // Save reset token to user
      await storage.updateUser(user.id, {
        resetToken,
        resetTokenExpires
      });

      // Send reset email (if email service is configured)
      if (user.email) {
        try {
          const { emailService } = await import('./emailService');
          const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;
          
          await emailService.sendEmail({
            to: user.email,
            subject: 'Password Reset - ClientHub',
            html: `
              <h2>Password Reset Request</h2>
              <p>Hello ${user.firstName},</p>
              <p>You requested a password reset for your ClientHub account.</p>
              <p><a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Your Password</a></p>
              <p>Or copy this link: ${resetUrl}</p>
              <p>This link will expire in 1 hour.</p>
              <p>If you didn't request this reset, you can safely ignore this email.</p>
            `,
            text: `Password reset requested for ${user.firstName}. Visit: ${resetUrl}`
          });
        } catch (emailError) {
          console.error('Failed to send reset email:', emailError);
        }
      }

      res.json({ message: "If an account exists, reset instructions will be sent" });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: "Failed to process reset request" });
    }
  });

  // Verify reset token
  app.get('/api/verify-reset-token', async (req, res) => {
    try {
      const { token } = req.query;
      
      if (!token) {
        return res.status(400).json({ message: "Reset token is required" });
      }

      const user = await storage.getUserByResetToken(token as string);
      
      if (!user || !user.resetTokenExpires || new Date() > new Date(user.resetTokenExpires)) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      res.json({ valid: true });
    } catch (error) {
      console.error('Verify reset token error:', error);
      res.status(500).json({ message: "Failed to verify reset token" });
    }
  });

  // Reset password
  app.post('/api/reset-password', async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }

      const user = await storage.getUserByResetToken(token);
      
      if (!user || !user.resetTokenExpires || new Date() > new Date(user.resetTokenExpires)) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Hash new password
      const hashedPassword = await hashPassword(password);

      // Update password and clear reset token
      await storage.updateUser(user.id, {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null
      });

      res.json({ message: "Password reset successful" });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Admin password reset (for administrators to reset any user's password)
  app.post('/api/admin/reset-password/:userId', async (req, res) => {
    try {
      // Check if current user is authenticated and is an administrator
      if (!req.isAuthenticated() || !req.user || req.user.accessLevel !== 'administrator') {
        return res.status(403).json({ message: "Administrator access required" });
      }

      const { userId } = req.params;
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ message: "Password is required" });
      }

      // Get the target user
      const targetUser = await storage.getUserById(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Hash new password
      const hashedPassword = await hashPassword(password);

      // Update password and clear any existing reset token
      await storage.updateUser(userId, {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null
      });

      res.json({ message: `Password reset successful for ${targetUser.firstName} ${targetUser.lastName}` });
    } catch (error) {
      console.error('Admin reset password error:', error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });
}