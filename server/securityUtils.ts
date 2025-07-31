/**
 * Security utilities to prevent ReDoS attacks and other vulnerabilities
 */

// Input validation to prevent Regular Expression Denial of Service (ReDoS) attacks
export function validateSafeInput(input: string, maxLength: number = 1000): boolean {
  // Check for excessive length that could cause ReDoS
  if (input.length > maxLength) {
    return false;
  }

  // Check for excessive repeated characters or spaces that could trigger ReDoS
  const excessiveRepeats = /(.)\1{50,}/;
  const excessiveSpaces = / {50,}/;
  
  if (excessiveRepeats.test(input) || excessiveSpaces.test(input)) {
    return false;
  }

  return true;
}

// Sanitize email addresses to prevent injection attacks
export function sanitizeEmailAddress(email: string): string {
  // Remove any potentially dangerous characters while preserving valid email format
  return email.replace(/[^\w@.-]/g, '').trim();
}

// Safe string truncation for logging
export function safeTruncate(str: string, maxLength: number = 200): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength) + '... [truncated]';
}

// Validate email header content for safety
export function validateEmailHeader(header: string): boolean {
  // Check for CRLF injection attempts
  if (header.includes('\r') || header.includes('\n')) {
    return false;
  }
  
  // Check for excessively long headers
  if (header.length > 2000) {
    return false;
  }
  
  return validateSafeInput(header);
}

// Rate limiting helper for email processing
class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  
  isAllowed(identifier: string, maxAttempts: number = 10, windowMs: number = 60000): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(identifier) || [];
    
    // Remove old attempts outside the window
    const validAttempts = attempts.filter(time => now - time < windowMs);
    
    if (validAttempts.length >= maxAttempts) {
      return false;
    }
    
    validAttempts.push(now);
    this.attempts.set(identifier, validAttempts);
    return true;
  }
  
  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

export const emailProcessingRateLimit = new RateLimiter();