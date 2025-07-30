import { Router } from 'express';
import { z } from 'zod';
import type { IStorage } from '../storage';
import UserEmailService from '../userEmailService';
// requireAuth middleware function
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

const userEmailConfigSchema = z.object({
  smtpHost: z.string().min(1),
  smtpPort: z.number().min(1).max(65535),
  smtpSecure: z.boolean(),
  smtpUser: z.string().email(),
  smtpPassword: z.string().min(1),
  imapHost: z.string().optional(),
  imapPort: z.number().min(1).max(65535).optional(),
  imapSecure: z.boolean().optional(),
});

export function createUserEmailRoutes(storage: IStorage): Router {
  const router = Router();
  const userEmailService = new UserEmailService(storage);

  // Get user's email configuration status
  router.get('/status', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const status = await userEmailService.getUserEmailStatus(userId);
      res.json(status);
    } catch (error) {
      console.error('Error getting email status:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Update user's email configuration
  router.post('/configure', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const validatedData = userEmailConfigSchema.parse(req.body);
      const success = await userEmailService.updateUserEmailConfig(userId, validatedData);

      if (success) {
        res.json({ success: true, message: 'Email configuration updated successfully' });
      } else {
        res.status(400).json({ message: 'Failed to update email configuration' });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Invalid email configuration',
          errors: error.errors,
        });
      }
      console.error('Error configuring email:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Test user's email configuration
  router.post('/test', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const success = await userEmailService.testEmailConfig(userId);
      res.json({ success, message: success ? 'Email configuration is valid' : 'Email configuration test failed' });
    } catch (error) {
      console.error('Error testing email config:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Send email using user's configuration
  router.post('/send', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { to, cc, bcc, subject, html, text } = req.body;

      if (!to || !subject || !html) {
        return res.status(400).json({ message: 'Missing required fields: to, subject, html' });
      }

      const success = await userEmailService.sendEmail(userId, {
        to,
        cc,
        bcc,
        subject,
        html,
        text,
      });

      if (success) {
        res.json({ success: true, message: 'Email sent successfully' });
      } else {
        res.status(400).json({ message: 'Failed to send email' });
      }
    } catch (error) {
      console.error('Error sending email:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  return router;
}