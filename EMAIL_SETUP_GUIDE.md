# Email Setup Guide for ClientHub

The invitation system now works with or without email configuration. Here are your options:

## Option 1: Manual Invitation Codes (Current Setup)
- Invitations show codes in the interface
- Copy and share codes manually with new users
- No additional setup required
- Working right now!

## Option 2: Gmail Setup (Recommended)
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security > 2-Step Verification > App passwords
   - Select "Mail" and generate password
3. Add these environment variables to Replit:
   ```
   GMAIL_USER=youremail@gmail.com
   GMAIL_APP_PASSWORD=your-16-character-app-password
   ```

## Option 3: Outlook/Hotmail Setup
1. Enable 2-factor authentication
2. Create an App Password in security settings
3. Add these environment variables:
   ```
   SMTP_HOST=smtp-mail.outlook.com
   SMTP_PORT=587
   SMTP_USER=youremail@outlook.com
   SMTP_PASS=your-app-password
   ```

## Option 4: Other Email Providers
Add these environment variables with your provider's SMTP settings:
```
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=youremail@domain.com
SMTP_PASS=your-password
SMTP_FROM=youremail@domain.com
```

## Testing
1. Go to User Management page
2. Check the Email Configuration Status card
3. Send a test invitation to see if it works

The system automatically detects your email configuration and adjusts accordingly!