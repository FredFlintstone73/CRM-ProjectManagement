import nodemailer from 'nodemailer';
import Imap from 'imap';
import { simpleParser } from 'mailparser';
import type { IStorage } from './storage';

interface UserEmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  imapHost?: string;
  imapPort?: number;
  imapSecure?: boolean;
}

interface EmailData {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  html: string;
  text?: string;
}

class UserEmailService {
  private storage: IStorage;
  private transporters: Map<string, any> = new Map();
  private imapClients: Map<string, Imap> = new Map();

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  // Get user's email configuration
  private async getUserEmailConfig(userId: string): Promise<UserEmailConfig | null> {
    try {
      const user = await this.storage.getUserById(userId);
      if (!user || !user.emailConfigured) {
        return null;
      }

      return {
        smtpHost: user.smtpHost!,
        smtpPort: user.smtpPort!,
        smtpSecure: user.smtpSecure!,
        smtpUser: user.smtpUser!,
        smtpPassword: user.smtpPassword!,
        imapHost: user.imapHost || undefined,
        imapPort: user.imapPort || undefined,
        imapSecure: user.imapSecure || undefined,
      };
    } catch (error) {
      console.error('Error getting user email config:', error);
      return null;
    }
  }

  // Create or get cached transporter for user
  private async getTransporter(userId: string) {
    if (this.transporters.has(userId)) {
      return this.transporters.get(userId);
    }

    const config = await this.getUserEmailConfig(userId);
    if (!config) {
      throw new Error('User email not configured');
    }

    const transporter = nodemailer.createTransporter({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPassword,
      },
    });

    // Verify the connection
    try {
      await transporter.verify();
      this.transporters.set(userId, transporter);
      return transporter;
    } catch (error) {
      console.error(`Email verification failed for user ${userId}:`, error);
      throw new Error('Email configuration invalid');
    }
  }

  // Send email using user's configuration
  async sendEmail(userId: string, emailData: EmailData): Promise<boolean> {
    try {
      const transporter = await this.getTransporter(userId);
      
      const mailOptions = {
        from: (await this.getUserEmailConfig(userId))?.smtpUser,
        to: emailData.to,
        cc: emailData.cc,
        bcc: emailData.bcc,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
      };

      await transporter.sendMail(mailOptions);
      console.log(`Email sent successfully by user ${userId}`);
      return true;
    } catch (error) {
      console.error(`Failed to send email for user ${userId}:`, error);
      return false;
    }
  }

  // Set up IMAP monitoring for a user
  async setupImapMonitoring(userId: string): Promise<boolean> {
    try {
      const config = await this.getUserEmailConfig(userId);
      if (!config || !config.imapHost) {
        console.log(`IMAP not configured for user ${userId}`);
        return false;
      }

      // Close existing connection if any
      if (this.imapClients.has(userId)) {
        this.imapClients.get(userId)?.end();
        this.imapClients.delete(userId);
      }

      const imap = new Imap({
        user: config.smtpUser,
        password: config.smtpPassword,
        host: config.imapHost,
        port: config.imapPort || 993,
        tls: config.imapSecure !== false,
        tlsOptions: { rejectUnauthorized: false },
      });

      imap.once('ready', () => {
        console.log(`IMAP connection ready for user ${userId}`);
        this.startEmailMonitoring(userId, imap);
      });

      imap.once('error', (err: any) => {
        console.error(`IMAP connection error for user ${userId}:`, err);
        this.imapClients.delete(userId);
      });

      imap.once('end', () => {
        console.log(`IMAP connection ended for user ${userId}`);
        this.imapClients.delete(userId);
      });

      imap.connect();
      this.imapClients.set(userId, imap);
      return true;
    } catch (error) {
      console.error(`Failed to setup IMAP monitoring for user ${userId}:`, error);
      return false;
    }
  }

  // Start monitoring emails for a user
  private startEmailMonitoring(userId: string, imap: Imap) {
    imap.openBox('INBOX', false, (err: any, box: any) => {
      if (err) {
        console.error(`Failed to open inbox for user ${userId}:`, err);
        return;
      }

      console.log(`Monitoring inbox for user ${userId}...`);

      // Listen for new emails
      imap.on('mail', async (numNewMsgs: number) => {
        console.log(`${numNewMsgs} new email(s) received for user ${userId}`);
        await this.processNewEmails(userId, imap);
      });

      // Process existing unread emails
      this.processNewEmails(userId, imap);
    });
  }

  // Process new emails for a user
  private async processNewEmails(userId: string, imap: Imap) {
    try {
      imap.search(['UNSEEN'], async (err: any, results: number[]) => {
        if (err || !results || results.length === 0) {
          return;
        }

        console.log(`Processing ${results.length} unread emails for user ${userId}`);

        const fetch = imap.fetch(results, { bodies: '', markSeen: true });

        fetch.on('message', (msg: any) => {
          msg.on('body', async (stream: any) => {
            try {
              const parsed = await simpleParser(stream);
              await this.saveEmailToDatabase(userId, parsed);
            } catch (error) {
              console.error(`Error parsing email for user ${userId}:`, error);
            }
          });
        });

        fetch.once('error', (err: any) => {
          console.error(`Fetch error for user ${userId}:`, err);
        });
      });
    } catch (error) {
      console.error(`Error processing emails for user ${userId}:`, error);
    }
  }

  // Save received email to database
  private async saveEmailToDatabase(userId: string, email: any) {
    try {
      // Find matching contact by email address
      const contacts = await this.storage.getContacts();
      const senderEmail = email.from?.value?.[0]?.address?.toLowerCase();
      
      if (!senderEmail) {
        console.log(`No sender email found for user ${userId}`);
        return;
      }

      const matchingContact = contacts.find((contact: any) => 
        contact.personalEmail?.toLowerCase() === senderEmail ||
        contact.workEmail?.toLowerCase() === senderEmail ||
        contact.spousePersonalEmail?.toLowerCase() === senderEmail ||
        contact.spouseWorkEmail?.toLowerCase() === senderEmail
      );

      if (!matchingContact) {
        console.log(`No matching contact found for email ${senderEmail} (user ${userId})`);
        return;
      }

      // Create email interaction
      await this.storage.createEmailInteraction({
        contactId: matchingContact.id,
        subject: email.subject || '',
        body: email.html || email.text || '',
        isIncoming: true,
        sender: senderEmail,
        recipient: email.to?.value?.[0]?.address || '',
        userId: userId,
      });

      console.log(`Email saved to database for contact ${matchingContact.id} (user ${userId})`);
    } catch (error) {
      console.error(`Error saving email to database for user ${userId}:`, error);
    }
  }

  // Update user email configuration
  async updateUserEmailConfig(userId: string, config: Partial<UserEmailConfig>): Promise<boolean> {
    try {
      await this.storage.updateUser(userId, {
        emailConfigured: true,
        smtpHost: config.smtpHost,
        smtpPort: config.smtpPort,
        smtpSecure: config.smtpSecure,
        smtpUser: config.smtpUser,
        smtpPassword: config.smtpPassword,
        imapHost: config.imapHost,
        imapPort: config.imapPort,
        imapSecure: config.imapSecure,
      });

      // Clear cached transporter to force recreation
      this.transporters.delete(userId);

      // Setup new IMAP monitoring if configured
      if (config.imapHost) {
        await this.setupImapMonitoring(userId);
      }

      return true;
    } catch (error) {
      console.error(`Error updating email config for user ${userId}:`, error);
      return false;
    }
  }

  // Test user email configuration
  async testEmailConfig(userId: string): Promise<boolean> {
    try {
      const transporter = await this.getTransporter(userId);
      await transporter.verify();
      return true;
    } catch (error) {
      console.error(`Email test failed for user ${userId}:`, error);
      return false;
    }
  }

  // Get user email status
  async getUserEmailStatus(userId: string): Promise<{configured: boolean, tested: boolean}> {
    const config = await this.getUserEmailConfig(userId);
    if (!config) {
      return { configured: false, tested: false };
    }

    const tested = await this.testEmailConfig(userId);
    return { configured: true, tested };
  }

  // Initialize monitoring for all configured users
  async initializeAllUserMonitoring() {
    try {
      const users = await this.storage.getUsers();
      const configuredUsers = users.filter(user => user.emailConfigured);
      
      console.log(`Initializing email monitoring for ${configuredUsers.length} configured users`);
      
      for (const user of configuredUsers) {
        await this.setupImapMonitoring(user.id);
      }
    } catch (error) {
      console.error('Error initializing user email monitoring:', error);
    }
  }

  // Cleanup resources
  cleanup() {
    this.imapClients.forEach((imap, userId) => {
      console.log(`Closing IMAP connection for user ${userId}`);
      imap.end();
    });
    this.imapClients.clear();
    this.transporters.clear();
  }
}

export default UserEmailService;