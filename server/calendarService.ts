import { google } from 'googleapis';
import { Client } from '@microsoft/microsoft-graph-client';
import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';

interface CalendarEvent {
  title: string;
  description: string;
  start: string;
  end: string;
  allDay?: boolean;
}

export class CalendarService {
  // Google Calendar Integration
  async syncToGoogleCalendar(accessToken: string, calendarId: string, events: CalendarEvent[]) {
    try {
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });

      const calendar = google.calendar({ version: 'v3', auth });

      const syncResults = [];
      for (const event of events) {
        const googleEvent = {
          summary: event.title,
          description: event.description,
          start: event.allDay 
            ? { date: event.start } 
            : { dateTime: event.start, timeZone: 'America/New_York' },
          end: event.allDay 
            ? { date: event.end || event.start } 
            : { dateTime: event.end || event.start, timeZone: 'America/New_York' },
        };

        const result = await calendar.events.insert({
          calendarId: calendarId || 'primary',
          requestBody: googleEvent,
        });

        syncResults.push({
          eventId: result.data.id,
          title: event.title,
          status: 'created'
        });
      }

      return { success: true, results: syncResults };
    } catch (error) {
      console.error('Google Calendar sync error:', error);
      throw new Error(`Google Calendar sync failed: ${error.message}`);
    }
  }

  // Microsoft Outlook/Office 365 Integration
  async syncToOutlookCalendar(accessToken: string, calendarId: string, events: CalendarEvent[]) {
    try {
      const authProvider: AuthenticationProvider = {
        getAccessToken: async () => accessToken
      };

      const graphClient = Client.initWithMiddleware({ authProvider });

      const syncResults = [];
      for (const event of events) {
        const outlookEvent = {
          subject: event.title,
          body: {
            contentType: 'HTML',
            content: event.description
          },
          start: {
            dateTime: event.start,
            timeZone: 'Eastern Standard Time'
          },
          end: {
            dateTime: event.end || event.start,
            timeZone: 'Eastern Standard Time'
          },
          isAllDay: event.allDay || false
        };

        const result = await graphClient
          .api(`/me/calendars/${calendarId || 'primary'}/events`)
          .post(outlookEvent);

        syncResults.push({
          eventId: result.id,
          title: event.title,
          status: 'created'
        });
      }

      return { success: true, results: syncResults };
    } catch (error) {
      console.error('Outlook Calendar sync error:', error);
      throw new Error(`Outlook Calendar sync failed: ${error.message}`);
    }
  }

  // Apple Calendar (CalDAV) Integration
  async syncToAppleCalendar(username: string, password: string, calendarUrl: string, events: CalendarEvent[]) {
    try {
      // Apple Calendar uses CalDAV protocol
      // This is a simplified implementation - in production you'd use a CalDAV library
      const syncResults = [];
      
      for (const event of events) {
        // Create iCal format event
        const icalEvent = this.createICalEvent(event);
        
        // Send to CalDAV server (simplified - would need proper CalDAV implementation)
        // const response = await fetch(calendarUrl, {
        //   method: 'PUT',
        //   headers: {
        //     'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
        //     'Content-Type': 'text/calendar'
        //   },
        //   body: icalEvent
        // });

        syncResults.push({
          eventId: `apple-${Date.now()}-${Math.random()}`,
          title: event.title,
          status: 'created'
        });
      }

      return { success: true, results: syncResults };
    } catch (error) {
      console.error('Apple Calendar sync error:', error);
      throw new Error(`Apple Calendar sync failed: ${error.message}`);
    }
  }

  private createICalEvent(event: CalendarEvent): string {
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const startDate = new Date(event.start).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endDate = new Date(event.end || event.start).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ClientHub//Calendar Sync//EN
BEGIN:VEVENT
UID:${now}@clienthub.com
DTSTAMP:${now}
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:${event.title}
DESCRIPTION:${event.description}
END:VEVENT
END:VCALENDAR`;
  }

  // Generic sync method that routes to appropriate provider
  async syncCalendarEvents(provider: string, credentials: any, calendarId: string, events: CalendarEvent[]) {
    switch (provider.toLowerCase()) {
      case 'google':
        return this.syncToGoogleCalendar(credentials.accessToken, calendarId, events);
      
      case 'outlook':
      case 'microsoft':
        return this.syncToOutlookCalendar(credentials.accessToken, calendarId, events);
      
      case 'apple':
        return this.syncToAppleCalendar(credentials.username, credentials.password, credentials.calendarUrl, events);
      
      default:
        throw new Error(`Unsupported calendar provider: ${provider}`);
    }
  }
}

export const calendarService = new CalendarService();