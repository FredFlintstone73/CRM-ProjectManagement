# Invitation System Fix Guide

## Issues Identified

### Issue 1: Wrong Email Sender Address
**Problem**: Invitations are being sent from `chadtennant@gmail.com` instead of `chad@alignedadvisors.com`

**Root Cause**: The email service is prioritizing Gmail configuration over Outlook configuration

**Solution**: Fixed email service to prioritize `chad@alignedadvisors.com` (OUTLOOK_USER) as the sender

### Issue 2: Invalid Invitation Code Errors
**Problem**: Team members getting "invitation code not valid" despite codes being in the database

**Root Cause**: Environment or database connectivity issues between development and deployed app

## UPDATED Valid Invitation Codes (July 28, 2025)

**PROBLEM RESOLVED**: The old invitation codes were in development database, not deployed database.

New working invitation codes in current database:

| Name | Email | Invitation Code |
|------|-------|----------------|
| Alex Borrero | alex@alignedadvisors.com | `alex2025invite` |
| Devyn Tennant | devyn@alignedadvisors.com | `devyn2025invite` |
| Megan Mountain | megan@alignedadvisors.com | `megan2025invite` |
| Taylor Milata | taylor@alignedadvisors.com | `taylor2025invite` |
| Mike Belgard | mike@alignedadvisors.com | `mike2025invite` |

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
Send your team members these UPDATED direct invitation links:

- **Alex**: https://crm-project-management.replit.app/accept-invitation?code=alex2025invite
- **Devyn**: https://crm-project-management.replit.app/accept-invitation?code=devyn2025invite
- **Megan**: https://crm-project-management.replit.app/accept-invitation?code=megan2025invite
- **Taylor**: https://crm-project-management.replit.app/accept-invitation?code=taylor2025invite
- **Mike**: https://crm-project-management.replit.app/accept-invitation?code=mike2025invite

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