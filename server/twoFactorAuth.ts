import * as speakeasy from "speakeasy";
import * as QRCode from "qrcode";
import { storage } from "./storage";

export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export class TwoFactorAuthService {
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 8; i++) {
      // Generate 8-character backup codes
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  async setupTwoFactor(userId: string, email: string): Promise<TwoFactorSetup> {
    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `ClientHub (${email})`,
      issuer: "ClientHub",
    });

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    return {
      secret: secret.base32!,
      qrCode,
      backupCodes,
    };
  }

  async enableTwoFactor(userId: string, secret: string, token: string, backupCodes: string[]): Promise<boolean> {
    // Verify the token
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Allow for time drift
    });

    if (!verified) {
      return false;
    }

    // Update user with 2FA settings
    await storage.enableTwoFactorAuth(userId, secret, backupCodes);
    return true;
  }

  async verifyTwoFactor(userId: string, token: string): Promise<boolean> {
    const user = await storage.getUser(userId);
    if (!user || !user.twoFactorSecret || !user.twoFactorEnabled) {
      return false;
    }

    // Check if it's a backup code
    if (user.backupCodes && Array.isArray(user.backupCodes)) {
      const backupCodes = user.backupCodes as string[];
      if (backupCodes.includes(token.toUpperCase())) {
        // Remove used backup code
        const updatedCodes = backupCodes.filter(code => code !== token.toUpperCase());
        await storage.updateUserBackupCodes(userId, updatedCodes);
        return true;
      }
    }

    // Verify TOTP token
    return speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2, // Allow for time drift
    });
  }

  async disableTwoFactor(userId: string): Promise<void> {
    await storage.disableTwoFactorAuth(userId);
  }

  async isTwoFactorEnabled(userId: string): Promise<boolean> {
    const user = await storage.getUser(userId);
    return user?.twoFactorEnabled === true;
  }
}

export const twoFactorAuthService = new TwoFactorAuthService();