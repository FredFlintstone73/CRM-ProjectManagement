import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';

export interface TwoFactorSetupData {
  secret: string;
  backupCodes: string[];
  qrCodeUrl: string;
  manualEntryKey: string;
}

export interface BackupCode {
  code: string;
  used: boolean;
  usedAt?: Date;
}

export class TwoFactorService {
  
  /**
   * Generate a new 2FA secret and setup data for a user
   */
  static generateSetup(userEmail: string, serviceName: string = 'ClientHub CRM'): TwoFactorSetupData {
    // Generate secret
    const secret = speakeasy.generateSecret({
      name: userEmail,
      issuer: serviceName,
      length: 32,
    });

    // Generate backup codes (8 codes, 8 characters each)
    const backupCodes = this.generateBackupCodes();

    return {
      secret: secret.base32!,
      backupCodes,
      qrCodeUrl: secret.otpauth_url!,
      manualEntryKey: secret.base32!,
    };
  }

  /**
   * Generate QR code as data URL for display
   */
  static async generateQRCode(otpauthUrl: string): Promise<string> {
    try {
      return await QRCode.toDataURL(otpauthUrl);
    } catch (error) {
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Verify a TOTP token against a secret
   */
  static verifyToken(token: string, secret: string, window: number = 1): boolean {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: window, // Allow for time drift (±30 seconds)
    });
  }

  /**
   * Generate backup codes for account recovery
   */
  static generateBackupCodes(count: number = 8): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric codes
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Format backup codes for storage (with metadata)
   */
  static formatBackupCodesForStorage(codes: string[]): BackupCode[] {
    return codes.map(code => ({
      code,
      used: false,
    }));
  }

  /**
   * Verify a backup code and mark it as used
   */
  static verifyBackupCode(inputCode: string, storedBackupCodes: BackupCode[]): { valid: boolean; updatedCodes?: BackupCode[] } {
    const normalizedInput = inputCode.toUpperCase().replace(/\s/g, '');
    
    const codeIndex = storedBackupCodes.findIndex(
      backupCode => backupCode.code === normalizedInput && !backupCode.used
    );

    if (codeIndex === -1) {
      return { valid: false };
    }

    // Mark the code as used
    const updatedCodes = [...storedBackupCodes];
    updatedCodes[codeIndex] = {
      ...updatedCodes[codeIndex],
      used: true,
      usedAt: new Date(),
    };

    return { valid: true, updatedCodes };
  }

  /**
   * Check if user has unused backup codes remaining
   */
  static hasUnusedBackupCodes(backupCodes: BackupCode[]): boolean {
    return backupCodes.some(code => !code.used);
  }

  /**
   * Count remaining unused backup codes
   */
  static countUnusedBackupCodes(backupCodes: BackupCode[]): number {
    return backupCodes.filter(code => !code.used).length;
  }

  /**
   * Generate new backup codes (for regeneration)
   */
  static regenerateBackupCodes(): string[] {
    return this.generateBackupCodes(8);
  }
}