interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string[];
}

export class OAuthService {
  private googleConfig: OAuthConfig = {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || `${process.env.REPL_URL || 'http://localhost:5000'}/api/oauth/google/callback`,
    scope: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events']
  };

  private microsoftConfig: OAuthConfig = {
    clientId: process.env.MICROSOFT_CLIENT_ID || '',
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
    redirectUri: process.env.MICROSOFT_REDIRECT_URI || `${process.env.REPL_URL || 'http://localhost:5000'}/api/oauth/microsoft/callback`,
    scope: ['https://graph.microsoft.com/calendars.readwrite', 'https://graph.microsoft.com/user.read']
  };

  // Generate OAuth authorization URLs
  getGoogleAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.googleConfig.clientId,
      redirect_uri: this.googleConfig.redirectUri,
      scope: this.googleConfig.scope.join(' '),
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      ...(state && { state })
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  getMicrosoftAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.microsoftConfig.clientId,
      redirect_uri: this.microsoftConfig.redirectUri,
      scope: this.microsoftConfig.scope.join(' '),
      response_type: 'code',
      response_mode: 'query',
      ...(state && { state })
    });

    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  }

  // Exchange authorization code for access token
  async exchangeGoogleCode(code: string): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.googleConfig.clientId,
          client_secret: this.googleConfig.clientSecret,
          redirect_uri: this.googleConfig.redirectUri,
          code,
          grant_type: 'authorization_code'
        })
      });

      if (!response.ok) {
        throw new Error(`Google OAuth error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in
      };
    } catch (error) {
      console.error('Google OAuth code exchange error:', error);
      throw new Error(`Failed to exchange Google OAuth code: ${error.message}`);
    }
  }

  async exchangeMicrosoftCode(code: string): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
    try {
      const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.microsoftConfig.clientId,
          client_secret: this.microsoftConfig.clientSecret,
          redirect_uri: this.microsoftConfig.redirectUri,
          code,
          grant_type: 'authorization_code'
        })
      });

      if (!response.ok) {
        throw new Error(`Microsoft OAuth error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in
      };
    } catch (error) {
      console.error('Microsoft OAuth code exchange error:', error);
      throw new Error(`Failed to exchange Microsoft OAuth code: ${error.message}`);
    }
  }

  // Refresh access tokens
  async refreshGoogleToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.googleConfig.clientId,
          client_secret: this.googleConfig.clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        })
      });

      if (!response.ok) {
        throw new Error(`Google token refresh error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        accessToken: data.access_token,
        expiresIn: data.expires_in
      };
    } catch (error) {
      console.error('Google token refresh error:', error);
      throw new Error(`Failed to refresh Google token: ${error.message}`);
    }
  }

  async refreshMicrosoftToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    try {
      const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.microsoftConfig.clientId,
          client_secret: this.microsoftConfig.clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        })
      });

      if (!response.ok) {
        throw new Error(`Microsoft token refresh error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        accessToken: data.access_token,
        expiresIn: data.expires_in
      };
    } catch (error) {
      console.error('Microsoft token refresh error:', error);
      throw new Error(`Failed to refresh Microsoft token: ${error.message}`);
    }
  }

  // Check if OAuth is properly configured
  isConfigured(provider: 'google' | 'microsoft'): boolean {
    const config = provider === 'google' ? this.googleConfig : this.microsoftConfig;
    return !!(config.clientId && config.clientSecret);
  }

  getRequiredSecrets(provider: 'google' | 'microsoft'): string[] {
    if (provider === 'google') {
      return ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];
    }
    return ['MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET'];
  }
}

export const oauthService = new OAuthService();