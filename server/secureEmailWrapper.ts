/**
 * Secure Email Service Wrapper
 * This module provides additional security layers around the IMAP email service
 * to mitigate potential vulnerabilities including the semver ReDoS issue in UTF7 dependency
 */

import type { IStorage } from './storage';
import { validateSafeInput, sanitizeEmailAddress, safeTruncate, validateEmailHeader, emailProcessingRateLimit } from './securityUtils';

// Security configuration constants
const SECURITY_CONFIG = {
  MAX_SUBJECT_LENGTH: 500,
  MAX_FROM_LENGTH: 200,  
  MAX_BODY_LENGTH: 50000,
  MAX_EMAILS_PER_SENDER: 20,
  RATE_LIMIT_WINDOW_MS: 300000, // 5 minutes
  MAX_PROCESSING_TIME_MS: 30000, // 30 seconds per email
} as const;

// Email processing circuit breaker to prevent system overload
class EmailCircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly threshold = 5;
  private readonly resetTimeout = 60000; // 1 minute

  isAllowed(): boolean {
    const now = Date.now();
    
    // Reset circuit breaker after timeout
    if (now - this.lastFailureTime > this.resetTimeout) {
      this.failureCount = 0;
    }
    
    return this.failureCount < this.threshold;
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
  }

  recordSuccess(): void {
    this.failureCount = 0;
  }
}

const emailCircuitBreaker = new EmailCircuitBreaker();

/**
 * Secure email processing wrapper that validates and sanitizes all inputs
 * before passing them to the underlying IMAP service
 */
export class SecureEmailProcessor {
  private storage: IStorage | null = null;

  setStorage(storage: IStorage): void {
    this.storage = storage;
  }

  /**
   * Safely process incoming email with comprehensive security checks
   */
  async processEmailSecurely(emailData: any): Promise<void> {
    // Circuit breaker check
    if (!emailCircuitBreaker.isAllowed()) {
      console.warn('Email processing circuit breaker active - skipping processing');
      return;
    }

    try {
      const startTime = Date.now();
      
      // Processing timeout to prevent long-running operations
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Email processing timeout')), SECURITY_CONFIG.MAX_PROCESSING_TIME_MS);
      });

      const processingPromise = this.processEmailInternal(emailData);
      
      await Promise.race([processingPromise, timeoutPromise]);
      
      emailCircuitBreaker.recordSuccess();
      console.log(`Email processed successfully in ${Date.now() - startTime}ms`);
      
    } catch (error) {
      emailCircuitBreaker.recordFailure();
      console.error('Secure email processing failed:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async processEmailInternal(emailData: any): Promise<void> {
    if (!this.storage) {
      throw new Error('Storage not configured');
    }

    // Extract and validate basic email fields
    const subject = String(emailData.subject || '').substring(0, SECURITY_CONFIG.MAX_SUBJECT_LENGTH);
    const from = String(emailData.from?.text || '').substring(0, SECURITY_CONFIG.MAX_FROM_LENGTH);
    const body = String(emailData.text || emailData.html || '').substring(0, SECURITY_CONFIG.MAX_BODY_LENGTH);

    // Comprehensive input validation
    if (!this.validateEmailInputs(subject, from, body)) {
      console.warn('Email failed security validation, skipping');
      return;
    }

    // Rate limiting by sender
    const fromEmail = sanitizeEmailAddress(from);
    if (!emailProcessingRateLimit.isAllowed(
      fromEmail, 
      SECURITY_CONFIG.MAX_EMAILS_PER_SENDER, 
      SECURITY_CONFIG.RATE_LIMIT_WINDOW_MS
    )) {
      console.warn(`Rate limit exceeded for email from: ${fromEmail}`);
      return;
    }

    console.log(`🔒 Securely processing email from: ${safeTruncate(from)}, subject: ${safeTruncate(subject)}`);

    // Find matching contact with sanitized email
    const matchingContact = await this.findContactByEmail(fromEmail);
    if (!matchingContact) {
      console.log('No matching contact found for email from:', safeTruncate(from));
      return;
    }

    // Process reply threading safely
    const { isReply, parentEmailId, targetContact } = await this.processReplyThreading(
      subject, 
      matchingContact
    );

    // Check for duplicates to prevent spam
    if (await this.isDuplicateEmail(targetContact.id, subject, fromEmail, emailData.date)) {
      console.log('Duplicate email detected, skipping');
      return;
    }

    // Create email interaction record
    await this.createEmailRecord(targetContact, subject, from, body, isReply, parentEmailId, emailData.date);
    
    console.log(`✅ Email securely processed for contact: ${targetContact.firstName} ${targetContact.lastName}`);
  }

  private validateEmailInputs(subject: string, from: string, body: string): boolean {
    // Check for safe input patterns
    if (!validateSafeInput(subject, SECURITY_CONFIG.MAX_SUBJECT_LENGTH) ||
        !validateSafeInput(from, SECURITY_CONFIG.MAX_FROM_LENGTH) ||
        !validateEmailHeader(subject)) {
      return false;
    }

    // Additional checks for email-specific threats
    if (this.containsSuspiciousPatterns(subject) || 
        this.containsSuspiciousPatterns(from) ||
        this.containsSuspiciousPatterns(body)) {
      return false;
    }

    return true;
  }

  private containsSuspiciousPatterns(input: string): boolean {
    // Check for patterns that could trigger ReDoS or other attacks
    const suspiciousPatterns = [
      /\s{100,}/, // Excessive spaces
      /(.)\1{100,}/, // Excessive character repetition
      /<script/i, // Script injection
      /javascript:/i, // JavaScript protocol
      /data:.*base64/i, // Suspicious data URLs
    ];

    return suspiciousPatterns.some(pattern => pattern.test(input));
  }

  private async findContactByEmail(email: string): Promise<any> {
    if (!this.storage) return null;
    
    const contacts = await this.storage.getContacts();
    return contacts.find(contact => 
      (contact.personalEmail && email.toLowerCase() === contact.personalEmail.toLowerCase()) ||
      (contact.workEmail && email.toLowerCase() === contact.workEmail.toLowerCase()) ||
      (contact.spousePersonalEmail && email.toLowerCase() === contact.spousePersonalEmail.toLowerCase())
    );
  }

  private async processReplyThreading(subject: string, matchingContact: any): Promise<{
    isReply: boolean;
    parentEmailId: number | null;
    targetContact: any;
  }> {
    if (!this.storage) {
      return { isReply: false, parentEmailId: null, targetContact: matchingContact };
    }

    const isReply = subject.toLowerCase().includes('re:');
    if (!isReply) {
      return { isReply: false, parentEmailId: null, targetContact: matchingContact };
    }

    // Safely extract original subject without triggering ReDoS
    const originalSubject = subject.replace(/^re:\s*/i, '').trim().substring(0, 200);
    
    // Search for parent email
    const allContacts = await this.storage.getContacts();
    for (const contact of allContacts) {
      const contactEmails = await this.storage.getEmailInteractionsByContact(contact.id);
      const parentEmail = contactEmails.find(email => 
        email.subject?.toLowerCase().includes(originalSubject.toLowerCase()) &&
        email.emailType === 'sent'
      );

      if (parentEmail) {
        return { isReply: true, parentEmailId: parentEmail.id, targetContact: contact };
      }
    }

    return { isReply: true, parentEmailId: null, targetContact: matchingContact };
  }

  private async isDuplicateEmail(
    contactId: number, 
    subject: string, 
    fromEmail: string, 
    emailDate: Date
  ): Promise<boolean> {
    if (!this.storage) return false;

    const existingEmails = await this.storage.getEmailInteractionsByContact(contactId);
    const currentTimestamp = emailDate || new Date();

    return existingEmails.some(existingEmail => {
      const subjectMatch = existingEmail.subject === subject;
      const senderMatch = existingEmail.sender?.includes(fromEmail);
      const typeMatch = existingEmail.emailType === 'received';
      const timeMatch = Math.abs(
        new Date(existingEmail.sentAt || existingEmail.createdAt || new Date()).getTime() - 
        currentTimestamp.getTime()
      ) < 300000; // Within 5 minutes

      return subjectMatch && senderMatch && typeMatch && timeMatch;
    });
  }

  private async createEmailRecord(
    contact: any,
    subject: string,
    from: string,
    body: string,
    isReply: boolean,
    parentEmailId: number | null,
    emailDate: Date
  ): Promise<void> {
    if (!this.storage) return;

    const emailInteraction = await this.storage.createEmailInteraction({
      contactId: contact.id,
      subject: safeTruncate(subject, 500),
      body: safeTruncate(body, 50000),
      sender: safeTruncate(from, 200),
      recipient: 'system',
      emailType: 'received' as const,
      sentAt: emailDate || new Date(),
      parentEmailId: parentEmailId || undefined,
    });

    // Create notification for all users
    const users = await this.storage.getUsers();
    for (const user of users) {
      try {
        await this.storage.createEmailNotification({
          userId: user.id,
          emailInteractionId: emailInteraction.id,
        });
      } catch (error) {
        console.error('Failed to create email notification for user:', user.id, error);
      }
    }
  }
}

export const secureEmailProcessor = new SecureEmailProcessor();