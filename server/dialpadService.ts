import { DatabaseStorage } from './storage.js';

export interface DialpadConfig {
  apiToken: string;
  webhookSecret: string;
  baseUrl: string;
}

export interface DialpadCallEvent {
  call_id: string;
  state: string;
  direction: 'inbound' | 'outbound';
  from_number: string;
  to_number: string;
  duration?: number;
  started_time?: string;
  ended_time?: string;
  transcript_id?: string;
}

export interface DialpadTranscript {
  call_id: string;
  transcript: string;
  speakers: Array<{
    id: string;
    name?: string;
    phone_number?: string;
  }>;
  moments: Array<{
    type: 'action_item' | 'sentiment' | 'summary' | 'question';
    content: string;
    timestamp: number;
    speaker_id?: string;
  }>;
  duration: number;
  confidence_score?: number;
}

export interface DialpadTextMessage {
  message_id: string;
  conversation_id: string;
  from_number: string;
  to_number: string;
  content: string;
  timestamp: string;
  direction: 'inbound' | 'outbound';
  media_urls?: string[];
}

export class DialpadService {
  private config: DialpadConfig;
  private storage: DatabaseStorage;

  constructor(config: DialpadConfig, storage: DatabaseStorage) {
    this.config = config;
    this.storage = storage;
  }

  /**
   * Verify webhook signature for security
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!signature || !this.config.webhookSecret) {
      return false;
    }

    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Fetch call transcript from Dialpad API
   */
  async fetchCallTranscript(callId: string): Promise<DialpadTranscript | null> {
    try {
      const response = await fetch(`${this.config.baseUrl}/transcripts/${callId}`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error(`Failed to fetch transcript for call ${callId}:`, response.status);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching Dialpad transcript:', error);
      return null;
    }
  }

  /**
   * Find contact by phone number
   */
  async findContactByPhoneNumber(phoneNumber: string): Promise<number | null> {
    // Clean phone number (remove formatting)
    const cleanNumber = phoneNumber.replace(/[^\d]/g, '');
    
    // Try to find contact by various phone fields
    const contacts = await this.storage.getContacts();
    
    for (const contact of contacts) {
      const phoneFields = [
        contact.cellPhone,
        contact.workPhone,
        contact.spouseCellPhone,
        contact.spouseWorkPhone
      ];

      for (const phone of phoneFields) {
        if (phone) {
          const cleanContactPhone = phone.replace(/[^\d]/g, '');
          // Match last 10 digits for US numbers
          if (cleanNumber.slice(-10) === cleanContactPhone.slice(-10)) {
            return contact.id;
          }
        }
      }
    }

    return null;
  }

  /**
   * Process call event webhook
   */
  async processCallEvent(callEvent: DialpadCallEvent): Promise<void> {
    console.log('Processing Dialpad call event:', callEvent.call_id, callEvent.state);

    // Only process completed calls with transcripts
    if (callEvent.state !== 'hangup' && callEvent.state !== 'call_transcription') {
      return;
    }

    // Find contact based on phone number
    const phoneNumber = callEvent.direction === 'inbound' 
      ? callEvent.from_number 
      : callEvent.to_number;
    
    const contactId = await this.findContactByPhoneNumber(phoneNumber);
    if (!contactId) {
      console.log(`No contact found for phone number: ${phoneNumber}`);
      return;
    }

    // Fetch transcript if available
    const transcript = await this.fetchCallTranscript(callEvent.call_id);
    
    // Create interaction record
    await this.createCallInteraction(contactId, callEvent, transcript);
  }

  /**
   * Create call interaction record
   */
  async createCallInteraction(
    contactId: number, 
    callEvent: DialpadCallEvent, 
    transcript: DialpadTranscript | null
  ): Promise<void> {
    const callDirection = callEvent.direction === 'inbound' ? 'Received' : 'Made';
    const duration = callEvent.duration ? `${Math.round(callEvent.duration / 60)}m ${callEvent.duration % 60}s` : 'Unknown';
    
    let interactionContent = `${callDirection} call - Duration: ${duration}`;
    
    if (transcript) {
      interactionContent += `\n\n**Transcript:**\n${transcript.transcript}`;
      
      // Add AI moments if available
      if (transcript.moments && transcript.moments.length > 0) {
        interactionContent += '\n\n**Key Moments:**';
        
        transcript.moments.forEach((moment, index) => {
          interactionContent += `\n${index + 1}. **${moment.type.replace('_', ' ').toUpperCase()}**: ${moment.content}`;
        });
      }
    }

    try {
      // Create a communication interaction record
      await this.storage.createContactNote({
        contactId,
        content: interactionContent
      }, 'system');

      console.log(`Created call interaction for contact ${contactId}, call ${callEvent.call_id}`);
    } catch (error) {
      console.error('Error creating call interaction:', error);
    }
  }

  /**
   * Process text message event
   */
  async processTextMessage(textMessage: DialpadTextMessage): Promise<void> {
    console.log('Processing Dialpad text message:', textMessage.message_id);

    // Find contact based on phone number
    const phoneNumber = textMessage.direction === 'inbound' 
      ? textMessage.from_number 
      : textMessage.to_number;
    
    const contactId = await this.findContactByPhoneNumber(phoneNumber);
    if (!contactId) {
      console.log(`No contact found for phone number: ${phoneNumber}`);
      return;
    }

    // Create text interaction record
    await this.createTextInteraction(contactId, textMessage);
  }

  /**
   * Create text interaction record
   */
  async createTextInteraction(contactId: number, textMessage: DialpadTextMessage): Promise<void> {
    const direction = textMessage.direction === 'inbound' ? 'Received' : 'Sent';
    
    let content = `${direction} text message:\n\n${textMessage.content}`;
    
    // Add media attachments if present
    if (textMessage.media_urls && textMessage.media_urls.length > 0) {
      content += '\n\n**Attachments:**';
      textMessage.media_urls.forEach((url, index) => {
        content += `\n${index + 1}. ${url}`;
      });
    }

    try {
      await this.storage.createContactNote({
        contactId,
        content: content
      }, 'system');

      console.log(`Created text interaction for contact ${contactId}, message ${textMessage.message_id}`);
    } catch (error) {
      console.error('Error creating text interaction:', error);
    }
  }

  /**
   * Setup webhook subscriptions
   */
  async setupWebhookSubscriptions(webhookUrl: string): Promise<void> {
    const subscriptions = [
      {
        event_type: 'call.transcription',
        description: 'Call transcription events'
      },
      {
        event_type: 'call.hangup',
        description: 'Call completion events'
      },
      {
        event_type: 'sms.received',
        description: 'Incoming text messages'
      },
      {
        event_type: 'sms.sent',
        description: 'Outgoing text messages'
      }
    ];

    for (const subscription of subscriptions) {
      try {
        const response = await fetch(`${this.config.baseUrl}/webhooks`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: webhookUrl,
            event_type: subscription.event_type,
            secret: this.config.webhookSecret
          })
        });

        if (response.ok) {
          console.log(`✅ Created Dialpad webhook subscription for ${subscription.event_type}`);
        } else {
          const errorText = await response.text();
          console.error(`❌ Failed to create webhook for ${subscription.event_type}:`, response.status, errorText);
        }
      } catch (error) {
        console.error(`Error creating webhook subscription for ${subscription.event_type}:`, error);
      }
    }
  }

  /**
   * Process incoming webhook event
   */
  async processWebhookEvent(eventType: string, eventData: any): Promise<void> {
    try {
      switch (eventType) {
        case 'call.transcription':
        case 'call.hangup':
          await this.processCallEvent(eventData);
          break;
        
        case 'sms.received':
        case 'sms.sent':
          await this.processTextMessage(eventData);
          break;
        
        default:
          console.log(`Unhandled Dialpad event type: ${eventType}`);
      }
    } catch (error) {
      console.error(`Error processing Dialpad webhook event ${eventType}:`, error);
    }
  }
}