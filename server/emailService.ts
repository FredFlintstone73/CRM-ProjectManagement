import nodemailer from 'nodemailer';

interface EmailConfig {
  service?: string; // 'gmail', 'outlook', etc.
  host?: string;
  port?: number;
  secure?: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: any = null;
  private isConfigured = false;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // Check for different email service configurations
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    let config: EmailConfig | null = null;

    if (gmailUser && gmailPass) {
      // Check if it's an Outlook/Microsoft account
      if (gmailUser.includes('@outlook.com') || gmailUser.includes('@hotmail.com') || 
          gmailUser.includes('@live.com') || gmailUser.includes('alignedadvisors.com')) {
        config = {
          host: 'smtp-mail.outlook.com',
          port: 587,
          secure: false,
          auth: {
            user: gmailUser,
            pass: gmailPass,
          },
        };
      } else {
        // Gmail configuration
        config = {
          service: 'gmail',
          auth: {
            user: gmailUser,
            pass: gmailPass, // App-specific password
          },
        };
      }
    } else if (smtpHost && smtpUser && smtpPass) {
      config = {
        host: smtpHost,
        port: parseInt(smtpPort || '587'),
        secure: (smtpPort === '465'),
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      };
    }

    if (config) {
      this.transporter = nodemailer.createTransport(config);
      this.isConfigured = true;
      const serviceType = config.service || `${config.host}:${config.port}`;
      console.log(`Email service configured successfully (${serviceType}) for ${gmailUser}`);
    } else {
      console.log('No email configuration found - invitations will show codes only');
      this.isConfigured = false;
    }
  }

  async sendInvitationEmail(invitation: {
    email: string;
    firstName: string;
    lastName: string;
    invitationCode: string;
    accessLevel: string;
    invitedBy: string;
  }): Promise<{ sent: boolean; message: string }> {
    if (!this.isConfigured) {
      return {
        sent: false,
        message: 'Email service not configured. Invitation code available in interface.',
      };
    }

    const subject = 'Invitation to join ClientHub CRM';
    const inviteUrl = `${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000'}/accept-invitation?code=${invitation.invitationCode}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">You're invited to join ClientHub</h2>
        <p>Hello ${invitation.firstName} ${invitation.lastName},</p>
        
        <p>You've been invited to join ClientHub CRM with <strong>${invitation.accessLevel.replace('_', ' ')}</strong> access.</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Your invitation details:</h3>
          <p><strong>Invitation Code:</strong> ${invitation.invitationCode}</p>
          <p><strong>Access Level:</strong> ${invitation.accessLevel.replace('_', ' ')}</p>
        </div>
        
        <p>
          <a href="${inviteUrl}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Accept Invitation
          </a>
        </p>
        
        <p style="color: #666; font-size: 14px;">
          This invitation will expire in 7 days. If you have any questions, please contact your administrator.
        </p>
      </div>
    `;

    const text = `
      You're invited to join ClientHub CRM
      
      Hello ${invitation.firstName} ${invitation.lastName},
      
      You've been invited to join ClientHub CRM with ${invitation.accessLevel.replace('_', ' ')} access.
      
      Invitation Code: ${invitation.invitationCode}
      Access Level: ${invitation.accessLevel.replace('_', ' ')}
      
      Click here to accept: ${inviteUrl}
      
      This invitation will expire in 7 days.
    `;

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.GMAIL_USER,
        to: invitation.email,
        subject,
        html,
        text,
      });

      return {
        sent: true,
        message: 'Invitation email sent successfully',
      };
    } catch (error) {
      console.error('Failed to send email:', error);
      return {
        sent: false,
        message: `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  isEmailConfigured(): boolean {
    return this.isConfigured;
  }
}

export const emailService = new EmailService();