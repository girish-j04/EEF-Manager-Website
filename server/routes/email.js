/**
 * Email Routes
 *
 * API endpoints for sending emails via Microsoft Graph
 */

import express from 'express';
import { graphService } from '../services/graphClient.js';
import { validateEmailRequest } from '../middleware/validators.js';

const router = express.Router();

/**
 * POST /api/email/send
 *
 * Send an email via Microsoft Graph API
 *
 * Body:
 * {
 *   "from": "sender@example.com",
 *   "to": "recipient@example.com" or ["recipient1@example.com", "recipient2@example.com"],
 *   "subject": "Email subject",
 *   "body": "Email body content",
 *   "isHtml": true (optional, defaults to true),
 *   "cc": "cc@example.com" (optional),
 *   "bcc": "bcc@example.com" (optional)
 * }
 */
router.post('/send', validateEmailRequest, async (req, res, next) => {
  try {
    const result = await graphService.sendEmail(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/email/send-batch
 *
 * Send multiple emails in batch
 *
 * Body:
 * {
 *   "emails": [
 *     {
 *       "from": "sender@example.com",
 *       "to": "recipient1@example.com",
 *       "subject": "Subject 1",
 *       "body": "Body 1"
 *     },
 *     {
 *       "from": "sender@example.com",
 *       "to": "recipient2@example.com",
 *       "subject": "Subject 2",
 *       "body": "Body 2"
 *     }
 *   ]
 * }
 */
router.post('/send-batch', async (req, res, next) => {
  try {
    const { emails } = req.body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'emails array is required and must not be empty'
      });
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < emails.length; i++) {
      try {
        const result = await graphService.sendEmail(emails[i]);
        results.push({
          index: i,
          success: true,
          ...result
        });
      } catch (error) {
        errors.push({
          index: i,
          success: false,
          error: error.message,
          email: emails[i]
        });
      }
    }

    res.status(200).json({
      total: emails.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/email/user/:userId
 *
 * Get user information (for verification)
 */
router.get('/user/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await graphService.getUser(userId);
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/email/test
 *
 * Test endpoint to verify Graph API connectivity
 */
router.post('/test', async (req, res, next) => {
  try {
    await graphService.initialize();
    res.status(200).json({
      success: true,
      message: 'Microsoft Graph API connection successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

export default router;
