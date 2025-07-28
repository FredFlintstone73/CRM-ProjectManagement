# Invitation System Fix Guide

## Issues Identified

### Issue 1: Wrong Email Sender Address
**Problem**: Invitations are being sent from `chadtennant@gmail.com` instead of `chad@alignedadvisors.com`

**Root Cause**: The email service is prioritizing Gmail configuration over Outlook configuration

**Solution**: Fixed email service to prioritize `chad@alignedadvisors.com` (OUTLOOK_USER) as the sender

### Issue 2: Invalid Invitation Code Errors
**Problem**: Team members getting "invitation code not valid" despite codes being in the database

**Root Cause**: Environment or database connectivity issues between development and deployed app

## Current Valid Invitation Codes

Based on the database, these are the current valid invitation codes:

| Name | Email | Invitation Code |
|------|-------|----------------|
| Devyn Tennant | devyn@alignedadvisors.com | `2lw57qs0ijhjghtwdw8h28` |
| Megan Mountain | megan@alignedadvisors.com | `iq4a2h2jotqq6ntkyqaqxh` |
| Taylor Milata | taylor@alignedadvisors.com | `m1f99859dfezy96o8ykdh` |
| Alex Borrero | alex@alignedadvisors.com | `llwkiu8gw7bf3jat5httic` |
| Mike Belgard | mike@alignedadvisors.com | `gbke5d0ou98tjmz4mj5xqr` |

## Environment Variables Needed

For the email sender fix to work properly, ensure your deployed app has:

```bash
# For chad@alignedadvisors.com emails
OUTLOOK_USER=chad@alignedadvisors.com
OUTLOOK_PASSWORD=your_outlook_app_password

# Backup Gmail configuration (will be used if Outlook not available)
GMAIL_USER=chadtennant@gmail.com
GMAIL_APP_PASSWORD=your_gmail_app_password
```

## Step-by-Step Fix Instructions

### 1. Update Environment Variables
1. Go to your Replit deployment settings
2. Add/update these environment variables:
   - `OUTLOOK_USER=chad@alignedadvisors.com`
   - `OUTLOOK_PASSWORD=your_outlook_app_password`
3. Deploy the changes

### 2. Test Invitation System
1. Go to User Management page
2. Send a test invitation to yourself
3. Verify it comes from `chad@alignedadvisors.com`

### 3. Share Working Codes with Team
Send your team members these direct invitation links:

- **Devyn**: [Your App URL]/accept-invitation?code=2lw57qs0ijhjghtwdw8h28
- **Megan**: [Your App URL]/accept-invitation?code=iq4a2h2jotqq6ntkyqaqxh
- **Taylor**: [Your App URL]/accept-invitation?code=m1f99859dfezy96o8ykdh
- **Alex**: [Your App URL]/accept-invitation?code=llwkiu8gw7bf3jat5httic
- **Mike**: [Your App URL]/accept-invitation?code=gbke5d0ou98tjmz4mj5xqr

### 4. Instructions for Team Members
1. Click the direct link above
2. If prompted, log in with your Replit account
3. Click "Accept Invitation"
4. Set up 2FA when prompted

## Debugging Added

The system now includes enhanced debugging that will:
- Log all invitation lookup attempts
- Show available invitation codes in the console
- Provide detailed error information
- Help identify environment/database connectivity issues

## Next Steps

1. Deploy the updated code with email sender fix
2. Update environment variables in deployment
3. Test invitation email sending
4. Share direct invitation links with team members
5. Monitor console logs for any remaining issues

All invitation codes are valid and not expired. The main issue is likely environment connectivity between your development and deployed environments.