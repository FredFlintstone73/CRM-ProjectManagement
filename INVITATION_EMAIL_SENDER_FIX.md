# Invitation Email Sender Fix

## Problem
Team members reported that invitation emails were coming from the Gmail account instead of the expected sender (the person who created the invitation).

## Root Cause
The email service was using hardcoded system email addresses (OUTLOOK_USER or GMAIL_USER) instead of dynamically using the logged-in user's email address as the sender.

## Solution Implemented

### 1. Dynamic Sender Detection
- Updated invitation creation route to get current user's information
- Pass user's email and name to email service as sender parameters

### 2. Email Service Enhancement  
- Modified `sendInvitationEmail` method to accept `senderEmail` and `senderName` parameters
- Updated email sending logic to use dynamic sender with fallback hierarchy:
  1. Logged-in user's email (primary)
  2. OUTLOOK_USER environment variable (fallback)
  3. GMAIL_USER environment variable (fallback)
  4. system@alignedadvisors.com (final fallback)

### 3. Enhanced Logging
Added detailed logging to show who the invitation is being sent from:
```
📧 Sending invitation from: Chad Tennant <chadtennant@gmail.com> to: alex@alignedadvisors.com
```

## Technical Changes

### Updated Route Handler
```typescript
// Get current user's email to use as sender
const currentUser = await storage.getUser(userId);
const senderEmail = currentUser?.email || 'system@alignedadvisors.com';

// Try to send email invitation
const emailResult = await emailService.sendInvitationEmail({
  // ... other fields
  senderEmail: senderEmail,
  senderName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Aligned Advisors Team',
});
```

### Updated Email Service
```typescript
const senderEmail = invitation.senderEmail || process.env.OUTLOOK_USER || process.env.GMAIL_USER || 'system@alignedadvisors.com';
const senderName = invitation.senderName || 'Aligned Advisors Team';
const fromAddress = `${senderName} <${senderEmail}>`;

await this.transporter.sendMail({
  from: fromAddress,
  // ... other options
});
```

## Result
- Invitation emails now come from the actual user who sent them
- Maintains proper fallback hierarchy for system reliability  
- Enhanced logging for debugging sender issues

## Next Steps
Deploy this fix to production so team members receive invitations from the correct sender address.