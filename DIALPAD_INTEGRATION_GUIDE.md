# Dialpad API Integration Guide

## Overview

The Dialpad integration automatically captures call transcripts, video call transcripts, and text messages from Dialpad and saves them directly into the contact's Interactions tab. This provides a seamless way to automatically document all communications with your contacts.

## Features

### ✅ **Call Transcription Capture**
- Automatically receives call transcripts when calls complete
- Includes AI-generated moments (action items, sentiment analysis, summaries)
- Captures both inbound and outbound calls
- Stores duration, direction, and full transcript text

### ✅ **Text Message Capture**
- Automatically captures incoming and outgoing SMS messages
- Includes media attachments (images, files)
- Matches messages to contacts via phone numbers

### ✅ **Contact Matching**
- Smart phone number matching across all contact phone fields:
  - Cell Phone (Contact 1)
  - Work Phone (Contact 1) 
  - Spouse Cell Phone (Contact 2)
  - Spouse Work Phone (Contact 2)
- Handles phone number formatting differences
- Matches on last 10 digits for US numbers

### ✅ **Security**
- Webhook signature verification using HMAC-SHA256
- Prevents unauthorized webhook requests
- System-level interaction creation (not attributed to individual users)

## Setup Requirements

### 1. Dialpad API Credentials

You need to obtain the following from your Dialpad account:

1. **API Token**: Go to Dialpad Admin > Integrations > API to generate an API token
2. **Webhook Secret**: Create a secure random string for webhook verification

### 2. Environment Variables

Add these environment variables to your deployment:

```bash
# Required
DIALPAD_API_TOKEN=your_api_token_here
DIALPAD_WEBHOOK_SECRET=your_secure_webhook_secret

# Optional (defaults shown)
DIALPAD_BASE_URL=https://dialpad.com/api/v2
DIALPAD_WEBHOOK_URL=https://your-app.com/api/dialpad/webhook
```

### 3. Webhook Configuration

After setting up the environment variables and deploying:

1. Navigate to **Administration > Dialpad** in your CRM
2. Click **"Setup Webhooks"** button
3. The system will automatically register webhooks for:
   - Call transcription events
   - Call completion events  
   - SMS received events
   - SMS sent events

## How It Works

### Call Workflow
1. **Call Completes**: When a call ends in Dialpad
2. **Webhook Triggered**: Dialpad sends webhook to `/api/dialpad/webhook`
3. **Contact Matching**: System matches phone number to contacts
4. **Transcript Fetch**: If transcript available, fetches full transcript with AI moments
5. **Interaction Created**: Creates interaction record in contact's history

### Text Message Workflow
1. **Message Sent/Received**: SMS activity in Dialpad
2. **Webhook Triggered**: Real-time webhook notification
3. **Contact Matching**: Phone number matched to existing contacts
4. **Interaction Created**: Message content stored in contact interactions

## Interaction Record Format

### Call Interactions
```
Made call - Duration: 5m 32s

**Transcript:**
[Full conversation transcript with speaker identification]

**Key Moments:**
1. **ACTION ITEM**: Follow up on proposal by Friday
2. **SENTIMENT**: Customer expressed interest in expansion
3. **SUMMARY**: Discussed Q4 budget and timeline
```

### Text Message Interactions  
```
Received text message:

Thank you for the proposal. We'll review and get back to you next week.

**Attachments:**
1. https://dialpad-media.com/attachment1.jpg
```

## Testing & Troubleshooting

### Contact Matching Test
Use the **"Test Contact Matching"** feature in Administration > Dialpad:
1. Enter a phone number
2. Click "Test Match"
3. System shows if contact was found and which contact ID

### Common Issues

**No interactions appearing:**
- Check that DIALPAD_API_TOKEN and DIALPAD_WEBHOOK_SECRET are set
- Verify webhooks are setup (green status in Dialpad settings)
- Test contact matching with known phone numbers

**Wrong contact matched:**
- Review phone number formatting in contact records
- Ensure phone numbers are entered consistently
- System matches on last 10 digits, so +1(555)123-4567 matches 5551234567

**Webhook signature errors:**
- Verify DIALPAD_WEBHOOK_SECRET matches what you configured in Dialpad
- Check that webhook URL is accessible from Dialpad servers

## API Endpoints

### Public Endpoints (No Authentication)
- `POST /api/dialpad/webhook` - Receives webhooks from Dialpad

### Admin Endpoints (Authentication Required)  
- `GET /api/dialpad/status` - Check configuration status
- `POST /api/dialpad/setup-webhooks` - Setup webhook subscriptions
- `POST /api/dialpad/test-contact-match` - Test phone number matching

## Database Storage

Interactions are stored in the `contact_notes` table with:
- **contactId**: Matched contact ID
- **note**: Formatted interaction content (call transcript or message)
- **noteType**: 'communication'
- **createdBy**: 'system' (indicates automatic capture)

## Rate Limits

Dialpad API rate limits:
- **General API**: 20 requests/second
- **Transcripts**: 1,200 requests/minute
- **Webhooks**: No specific limit

## Supported Event Types

The system processes these Dialpad webhook events:
- `call.transcription` - Call transcript available
- `call.hangup` - Call completed
- `sms.received` - Incoming text message
- `sms.sent` - Outgoing text message

## Security Considerations

1. **Webhook Verification**: All incoming webhooks are verified using HMAC signatures
2. **Environment Variables**: API credentials stored securely in environment variables
3. **Access Control**: Only administrators can configure Dialpad settings
4. **No User Data Exposure**: System creates interactions without exposing individual user information

## Future Enhancements

Potential future additions:
- Video call transcript capture
- Voicemail transcription
- Call recording attachments
- Custom interaction categorization
- Bulk historical import

## Support

For issues with the Dialpad integration:
1. Check the configuration status in Administration > Dialpad
2. Test contact matching functionality
3. Review server logs for webhook processing errors
4. Verify Dialpad API credentials and permissions