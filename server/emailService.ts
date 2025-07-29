import nodemailer from 'nodemailer';
import Imap from 'imap';
import { simpleParser } from 'mailparser';
import type { IStorage } from './storage';

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
  cc?: string;
  bcc?: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: any = null;
  private isConfigured = false;
  private imapClient: Imap | null = null;
  private storage: IStorage | null = null;
  private monitoring = false;

  // Format access level for display
  private formatAccessLevel(accessLevel: string): string {
    switch (accessLevel) {
      case 'team_member':
        return 'Team Member';
      case 'manager':
        return 'Manager';
      case 'administrator':
        return 'Administrator';
      default:
        return accessLevel.charAt(0).toUpperCase() + accessLevel.slice(1);
    }
  }

  constructor() {
    this.initializeTransporter();
  }

  // Set storage reference for email monitoring
  setStorage(storage: IStorage) {
    this.storage = storage;
  }

  private initializeTransporter() {
    // Check for different email service configurations
    const outlookUser = process.env.OUTLOOK_USER;
    const outlookPass = process.env.OUTLOOK_PASSWORD;
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    let config: EmailConfig | null = null;

    if (smtpHost && smtpUser && smtpPass) {
      // Generic SMTP configuration (prioritized for corporate accounts)
      config = {
        host: smtpHost,
        port: parseInt(smtpPort || '587'),
        secure: (smtpPort === '465'),
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      };
    } else if (outlookUser && outlookPass) {
      // Microsoft Outlook/365 configuration
      config = {
        host: 'smtp-mail.outlook.com',
        port: 587,
        secure: false,
        auth: {
          user: outlookUser,
          pass: outlookPass,
        },
      };
    } else if (gmailUser && gmailPass) {
      // Gmail configuration
      config = {
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPass, // App-specific password
        },
      };
    } else if (false) { // Disabled condition to prevent fallback
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
      const serviceType = smtpHost ? `smtp (${smtpHost})` : (outlookUser ? 'outlook' : (config.service || `${config.host}:${config.port}`));
      const emailUser = smtpUser || outlookUser || gmailUser;
      console.log(`Email service configured successfully (${serviceType}) for ${emailUser}`);
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
    
    // Generate invitation URL - use current environment or deployed domain
    const domains = process.env.REPLIT_DOMAINS?.split(',') || [];
    let baseUrl = '';
    
    if (domains.length > 0) {
      // If we're in development (has 00- pattern), use the current domain
      const currentDomain = domains.find(domain => domain.includes('00-'));
      const deployedDomain = domains.find(domain => 
        !domain.includes('00-') && domain.includes('.replit.dev')
      );
      
      // Prefer current development domain if available, otherwise use deployed
      if (currentDomain) {
        baseUrl = currentDomain.startsWith('http') ? currentDomain : `https://${currentDomain}`;
      } else if (deployedDomain) {
        baseUrl = deployedDomain.startsWith('http') ? deployedDomain : `https://${deployedDomain}`;
      } else {
        // Fallback to first domain if no specific match found
        const fallbackDomain = domains[0];
        baseUrl = fallbackDomain.startsWith('http') ? fallbackDomain : `https://${fallbackDomain}`;
      }
    } else {
      // Ultimate fallback for local development
      baseUrl = 'http://localhost:5000';
    }
    
    const inviteUrl = `${baseUrl}/accept-invitation?code=${invitation.invitationCode}`;
    console.log(`🔗 Generated invitation URL: ${inviteUrl}`);
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">You're invited to join ClientHub</h2>
        <p>Hello ${invitation.firstName} ${invitation.lastName},</p>
        
        <p>You've been invited to join ClientHub CRM with <strong>${this.formatAccessLevel(invitation.accessLevel)}</strong> access.</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Your invitation details:</h3>
          <p><strong>Invitation Code:</strong> ${invitation.invitationCode}</p>
          <p><strong>Access Level:</strong> ${this.formatAccessLevel(invitation.accessLevel)}</p>
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
      
      You've been invited to join ClientHub CRM with ${this.formatAccessLevel(invitation.accessLevel)} access.
      
      Invitation Code: ${invitation.invitationCode}
      Access Level: ${this.formatAccessLevel(invitation.accessLevel)}
      
      Click here to accept: ${inviteUrl}
      
      This invitation will expire in 7 days.
    `;

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.OUTLOOK_USER || process.env.GMAIL_USER,
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

  async sendEmail(emailData: EmailData): Promise<{ sent: boolean; message: string }> {
    if (!this.isConfigured) {
      return {
        sent: false,
        message: 'Email service not configured. Please configure OUTLOOK_USER/OUTLOOK_PASSWORD or GMAIL_USER/GMAIL_APP_PASSWORD.',
      };
    }

    try {
      const mailOptions: any = {
        from: process.env.OUTLOOK_USER || process.env.GMAIL_USER || process.env.SMTP_USER,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
      };

      // Add CC and BCC if provided
      if (emailData.cc && emailData.cc.trim()) {
        mailOptions.cc = emailData.cc;
      }
      if (emailData.bcc && emailData.bcc.trim()) {
        mailOptions.bcc = emailData.bcc;
      }

      await this.transporter.sendMail(mailOptions);

      return {
        sent: true,
        message: 'Email sent successfully',
      };
    } catch (error) {
      console.error('Failed to send email:', error);
      return {
        sent: false,
        message: `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  getConfigurationStatus(): {
    isConfigured: boolean;
    serviceType: string;
    user: string;
  } {
    const outlookUser = process.env.OUTLOOK_USER;
    const gmailUser = process.env.GMAIL_USER;
    const smtpUser = process.env.SMTP_USER;
    
    return {
      isConfigured: this.isConfigured,
      serviceType: outlookUser ? 'outlook' : (gmailUser ? 'gmail' : (smtpUser ? 'smtp' : 'none')),
      user: outlookUser || gmailUser || smtpUser || 'none',
    };
  }

  isEmailConfigured(): boolean {
    return this.isConfigured;
  }

  // Start monitoring incoming emails for automatic threading
  async startEmailMonitoring() {
    if (this.monitoring || !this.storage) {
      return;
    }

    try {
      const imapConfig = this.getImapConfig();
      if (!imapConfig) {
        console.log('IMAP not configured, email monitoring disabled');
        return;
      }

      this.imapClient = new Imap(imapConfig);
      this.monitoring = true;

      this.imapClient.once('ready', () => {
        console.log('IMAP connection ready, monitoring emails...');
        this.openInbox();
      });

      this.imapClient.once('error', (err: Error) => {
        console.error('IMAP connection error:', err);
        this.monitoring = false;
      });

      this.imapClient.once('end', () => {
        console.log('IMAP connection ended');
        this.monitoring = false;
      });

      this.imapClient.connect();
    } catch (error) {
      console.error('Error starting email monitoring:', error);
      this.monitoring = false;
    }
  }

  private getImapConfig() {
    const outlookUser = process.env.OUTLOOK_USER;
    const outlookPass = process.env.OUTLOOK_PASSWORD;
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;

    if (outlookUser && outlookPass) {
      return {
        user: outlookUser,
        password: outlookPass,
        host: 'outlook.office365.com',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false }
      };
    } else if (gmailUser && gmailPass) {
      return {
        user: gmailUser,
        password: gmailPass,
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false }
      };
    }

    return null;
  }

  private openInbox() {
    if (!this.imapClient) return;

    this.imapClient.openBox('INBOX', false, (err: Error, box: any) => {
      if (err) {
        console.error('Error opening inbox:', err);
        return;
      }

      console.log('Inbox opened, watching for new emails...');
      
      // Listen for new emails
      this.imapClient!.on('mail', (numNewMsgs: number) => {
        console.log(`${numNewMsgs} new email(s) received`);
        this.processNewEmails(numNewMsgs);
      });
    });
  }

  private async processNewEmails(numNewMsgs: number) {
    if (!this.imapClient || !this.storage) return;

    try {
      // Search for recent unread emails
      this.imapClient.search(['UNSEEN'], (err: Error, results: number[]) => {
        if (err) {
          console.error('Error searching emails:', err);
          return;
        }

        console.log(`🔍 IMAP search found ${results?.length || 0} unseen emails`);
        if (results.length === 0) return;

        // Process each new email
        const fetch = this.imapClient!.fetch(results, {
          bodies: '',
          markSeen: false
        });

        fetch.on('message', (msg: any) => {
          msg.on('body', (stream: any) => {
            let buffer = '';
            stream.on('data', (chunk: any) => {
              buffer += chunk.toString('utf8');
            });
            
            stream.once('end', async () => {
              try {
                const parsed = await simpleParser(buffer);
                await this.processIncomingEmail(parsed);
              } catch (error) {
                console.error('Error parsing email:', error);
              }
            });
          });
        });

        fetch.once('error', (err: Error) => {
          console.error('Fetch error:', err);
        });
      });
    } catch (error) {
      console.error('Error processing new emails:', error);
    }
  }

  private async processIncomingEmail(email: any) {
    if (!this.storage) return;

    try {
      const subject = email.subject || '';
      const from = email.from?.text || '';
      const body = email.text || email.html || '';
      
      console.log(`🔍 Processing incoming email from: ${from}, subject: ${subject}`);
      console.log(`📧 Email body preview: ${body.substring(0, 100)}...`);

      // Try to find matching contact by email - extract actual email address from the from field
      const emailRegex = /<([^>]+)>/;
      const emailMatch = from.match(emailRegex);
      const fromEmail = emailMatch ? emailMatch[1] : from.trim();
      
      const contacts = await this.storage.getContacts();
      const matchingContact = contacts.find(contact => 
        (contact.personalEmail && fromEmail.toLowerCase() === contact.personalEmail.toLowerCase()) ||
        (contact.workEmail && fromEmail.toLowerCase() === contact.workEmail.toLowerCase()) ||
        (contact.spousePersonalEmail && fromEmail.toLowerCase() === contact.spousePersonalEmail.toLowerCase())
      );

      // Check if this is a reply (contains "Re:" or "RE:")
      const isReply = subject.toLowerCase().includes('re:');
      let parentEmailId = null;
      let targetContact = matchingContact;

      if (isReply) {
        // For replies, we need to find the original conversation across ALL contacts
        const originalSubject = subject.replace(/^re:\s*/i, '').trim();
        console.log(`Looking for original email with subject: ${originalSubject}`);
        
        // Search all contacts for the original email
        const allContacts = await this.storage.getContacts();
        let originalEmail = null;
        
        for (const contact of allContacts) {
          const contactEmails = await this.storage.getEmailInteractionsByContact(contact.id);
          const foundEmail = contactEmails.find(email => 
            email.subject?.toLowerCase().includes(originalSubject.toLowerCase()) &&
            email.emailType === 'sent'
          );
          
          if (foundEmail) {
            originalEmail = foundEmail;
            targetContact = contact; // The reply should be associated with the contact who received the original email
            break;
          }
        }

        if (originalEmail) {
          parentEmailId = originalEmail.id;
          console.log(`Found parent email ID: ${parentEmailId} for reply, associating with contact: ${targetContact.firstName} ${targetContact.lastName}`);
        }
      }

      if (!targetContact) {
        console.log('No target contact found for email from:', from);
        return;
      }

      // Check if we've already recorded this email to avoid duplicates
      const existingEmails = await this.storage.getEmailInteractionsByContact(targetContact.id);
      const currentTimestamp = email.date || new Date();
      
      // Extract the actual email address from the from field for comparison
      const emailRegexForDupe = /<([^>]+)>/;
      const fromEmailForDupe = from.match(emailRegexForDupe)?.[1] || from.trim();
      
      console.log(`🔍 Checking for duplicates - Subject: "${subject}", From email: "${fromEmailForDupe}", Timestamp: ${currentTimestamp}`);
      console.log(`🔍 Found ${existingEmails.length} existing emails for contact ${targetContact.firstName} ${targetContact.lastName}`);
      
      const isDuplicate = existingEmails.some(existingEmail => {
        const existingFromEmail = existingEmail.sender?.match(emailRegexForDupe)?.[1] || existingEmail.sender;
        const subjectMatch = existingEmail.subject === subject;
        const senderMatch = existingFromEmail === fromEmailForDupe;
        const typeMatch = existingEmail.emailType === 'received';
        const timeMatch = Math.abs(new Date(existingEmail.sentAt || existingEmail.createdAt).getTime() - currentTimestamp.getTime()) < 300000; // Within 5 minutes
        
        console.log(`🔍 Comparing with existing email ID ${existingEmail.id}:`);
        console.log(`   - Subject: "${existingEmail.subject}" vs "${subject}" = ${subjectMatch}`);
        console.log(`   - Sender: "${existingFromEmail}" vs "${fromEmailForDupe}" = ${senderMatch}`);
        console.log(`   - Type: "${existingEmail.emailType}" vs "received" = ${typeMatch}`);
        console.log(`   - Time diff: ${Math.abs(new Date(existingEmail.sentAt || existingEmail.createdAt).getTime() - currentTimestamp.getTime())}ms = ${timeMatch}`);
        
        return subjectMatch && senderMatch && typeMatch && timeMatch;
      });

      if (isDuplicate) {
        console.log('Email already recorded, skipping duplicate');
        return;
      }

      // Create email interaction record
      const emailInteraction = await this.storage.createEmailInteraction({
        contactId: targetContact.id,
        parentEmailId,
        subject,
        body,
        sender: from,
        recipient: this.transporter?.options?.auth?.user || '',
        emailType: 'received',
        sentAt: email.date || new Date(),
      }, 'system');

      // Create email notification for all users (they can mark as read individually)
      try {
        const allUsers = await this.storage.getAllUsers();
        console.log(`📧 Creating email notifications for ${allUsers.length} users for email interaction ${emailInteraction.id}`);
        
        for (const user of allUsers) {
          const notification = await this.storage.createEmailNotification({
            userId: user.id,
            emailInteractionId: emailInteraction.id,
            isRead: false,
          });
          console.log(`📧 Created notification ID ${notification.id} for user ${user.email} (${user.id})`);
        }
        console.log(`📧 Successfully created notifications for all ${allUsers.length} users`);
      } catch (error) {
        console.error('Error creating email notifications:', error);
        // Continue execution even if notification creation fails
      }

      console.log(`Automatically recorded ${isReply ? 'reply email' : 'new email conversation'} from ${from} to contact: ${targetContact.firstName} ${targetContact.lastName} and created notifications`);
    } catch (error) {
      console.error('Error processing incoming email:', error);
    }
  }

  // Stop email monitoring
  stopEmailMonitoring() {
    if (this.imapClient && this.monitoring) {
      this.imapClient.end();
      this.monitoring = false;
      console.log('Email monitoring stopped');
    }
  }
}

export const emailService = new EmailService();