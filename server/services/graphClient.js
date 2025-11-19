/**
 * Microsoft Graph API Client Service
 *
 * Handles authentication and provides Graph client for email operations
 */

import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js';

class GraphService {
  constructor() {
    this.client = null;
    this.initialized = false;
  }

  /**
   * Initialize the Graph client with app-only authentication
   */
  async initialize() {
    if (this.initialized) return;

    try {
      const { TENANT_ID, CLIENT_ID, CLIENT_SECRET } = process.env;

      if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
        throw new Error('Missing required environment variables for Microsoft Graph API');
      }

      // Create credential using client credentials flow (app-only auth)
      const credential = new ClientSecretCredential(
        TENANT_ID,
        CLIENT_ID,
        CLIENT_SECRET
      );

      // Create authentication provider
      const authProvider = new TokenCredentialAuthenticationProvider(credential, {
        scopes: ['https://graph.microsoft.com/.default']
      });

      // Initialize Graph client
      this.client = Client.initWithMiddleware({
        authProvider
      });

      this.initialized = true;
      console.log('✅ Microsoft Graph client initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Microsoft Graph client:', error.message);
      throw error;
    }
  }

  /**
   * Get the Graph client instance
   */
  getClient() {
    if (!this.initialized || !this.client) {
      throw new Error('Graph client not initialized. Call initialize() first.');
    }
    return this.client;
  }

  /**
   * Send an email using Microsoft Graph API
   *
   * @param {Object} emailData - Email configuration
   * @param {string} emailData.from - Sender email address (must have SendAs permission)
   * @param {string|string[]} emailData.to - Recipient email address(es)
   * @param {string} emailData.subject - Email subject
   * @param {string} emailData.body - Email body (HTML or plain text)
   * @param {boolean} emailData.isHtml - Whether body is HTML (default: true)
   * @param {string|string[]} [emailData.cc] - CC recipients
   * @param {string|string[]} [emailData.bcc] - BCC recipients
   */
  async sendEmail(emailData) {
    await this.initialize();

    const {
      from,
      to,
      subject,
      body,
      isHtml = true,
      cc = [],
      bcc = []
    } = emailData;

    // Validate required fields
    if (!from || !to || !subject || !body) {
      throw new Error('Missing required email fields: from, to, subject, body');
    }

    // Normalize recipients to arrays
    const toRecipients = Array.isArray(to) ? to : [to];
    const ccRecipients = Array.isArray(cc) ? cc : (cc ? [cc] : []);
    const bccRecipients = Array.isArray(bcc) ? bcc : (bcc ? [bcc] : []);

    // Build email message
    const message = {
      message: {
        subject,
        body: {
          contentType: isHtml ? 'HTML' : 'Text',
          content: body
        },
        toRecipients: toRecipients.map(email => ({
          emailAddress: { address: email }
        })),
        ...(ccRecipients.length > 0 && {
          ccRecipients: ccRecipients.map(email => ({
            emailAddress: { address: email }
          }))
        }),
        ...(bccRecipients.length > 0 && {
          bccRecipients: bccRecipients.map(email => ({
            emailAddress: { address: email }
          }))
        })
      },
      saveToSentItems: true
    };

    try {
      // Send email from the specified user mailbox
      await this.client
        .api(`/users/${from}/sendMail`)
        .post(message);

      console.log(`✉️  Email sent successfully from ${from} to ${toRecipients.join(', ')}`);
      return {
        success: true,
        message: 'Email sent successfully',
        from,
        to: toRecipients
      };
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Get user information
   *
   * @param {string} userId - User ID or email address
   */
  async getUser(userId) {
    await this.initialize();

    try {
      const user = await this.client
        .api(`/users/${userId}`)
        .select('id,displayName,mail,userPrincipalName')
        .get();

      return user;
    } catch (error) {
      console.error(`❌ Failed to get user ${userId}:`, error);
      throw new Error(`Failed to get user: ${error.message}`);
    }
  }
}

// Export singleton instance
export const graphService = new GraphService();
