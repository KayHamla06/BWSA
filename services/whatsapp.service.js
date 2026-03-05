// services/whatsapp.service.js
import axios from 'axios';
import WhatsAppFlow from '../models/WhatsAppFlow.js';
import Customer from '../models/Customer.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.middleware.js';

class WhatsAppService {
  constructor() {
    this.baseURL = 'https://graph.facebook.com/v20.0';
    this.phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.token = process.env.WHATSAPP_API_TOKEN;
  }

  // Send text message
  async sendMessage(to, message, userId = null) {
    try {
      const phone = to.replace(/^\+/, '').replace(/\s/g, '');
      
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'text',
        text: { body: message },
      };

      const response = await axios.post(
        `${this.baseURL}/${this.phoneId}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      logger.info('WhatsApp message sent', { to: phone, messageId: response.data.messages[0].id });

      return response.data;
    } catch (error) {
      logger.error('WhatsApp send failed:', error.response?.data || error.message);
      throw new AppError('Failed to send WhatsApp message', 500);
    }
  }

  // Send template message
  async sendTemplate(to, templateName, parameters = [], userId = null) {
    try {
      const phone = to.replace(/^\+/, '').replace(/\s/g, '');
      
      const payload = {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en' },
          components: parameters.length > 0 ? [
            {
              type: 'body',
              parameters: parameters.map(text => ({ type: 'text', text })),
            },
          ] : [],
        },
      };

      const response = await axios.post(
        `${this.baseURL}/${this.phoneId}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info('WhatsApp template sent', { to: phone, template: templateName });

      return response.data;
    } catch (error) {
      logger.error('WhatsApp template send failed:', error.response?.data || error.message);
      throw new AppError('Failed to send WhatsApp template', 500);
    }
  }

  /**
   * Send product menu (interactive list message)
   */
  async sendProductMenu(toPhone, products, businessName) {
    try {
      const phone = toPhone.replace(/^\+/, '').replace(/\s/g, '');

      // Limit to 10 products (WhatsApp limit)
      const rows = products.slice(0, 10).map((product) => ({
        id: `product_${product._id.toString()}`,
        title: product.name.substring(0, 24),
        description: `R${product.price.toFixed(2)} | Stock: ${product.stock.quantity}`.substring(0, 72),
      }));

      const payload = {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'interactive',
        interactive: {
          type: 'list',
          header: {
            type: 'text',
            text: `${businessName} - Shop`,
          },
          body: {
            text: '📦 *Our Products*\n\nSelect a product to view details:',
          },
          footer: {
            text: 'Reply "help" for assistance',
          },
          action: {
            button: 'View Products',
            sections: [
              {
                title: 'Available Products',
                rows: rows,
              },
            ],
          },
        },
      };

      const response = await axios.post(
        `${this.baseURL}/${this.phoneId}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      logger.info('WhatsApp product menu sent', { to: phone, productCount: products.length });
      return response.data.messages[0];
    } catch (error) {
      logger.error('WhatsApp product menu failed', {
        to: toPhone,
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  /**
   * Send product details with action buttons
   */
  async sendProductDetails(toPhone, product) {
    try {
      const phone = toPhone.replace(/^\+/, '').replace(/\s/g, '');

      const message = `
*${product.name}*
━━━━━━━━━━━━━━━━━━━━
📝 ${product.description || 'Premium quality product'}

💰 *Price:* R${product.price.toFixed(2)}
📦 *In Stock:* ${product.stock.quantity > 0 ? '✅ Yes' : '❌ Out of Stock'}
      `.trim();

      const buttons = [];
      
      if (product.stock.quantity > 0) {
        buttons.push({
          type: 'reply',
          reply: {
            id: `buy_${product._id.toString()}`,
            title: '🛒 Add to Cart',
          },
        });
      }
      
      buttons.push({
        type: 'reply',
        reply: {
          id: 'view_menu',
          title: '📦 Back to Menu',
        },
      });

      const payload = {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: {
            text: message,
          },
          action: {
            buttons: buttons,
          },
        },
      };

      const response = await axios.post(
        `${this.baseURL}/${this.phoneId}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      logger.info('WhatsApp product details sent', { to: phone, product: product._id });
      return response.data.messages[0];
    } catch (error) {
      logger.error('WhatsApp product details failed', {
        to: toPhone,
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  /**
   * Send payment link with order details
   */
  async sendPaymentLink(toPhone, order, paymentLink) {
    try {
      const phone = toPhone.replace(/^\+/, '').replace(/\s/g, '');

      const itemsList = order.items
        .map((item) => `• ${item.name} x${item.quantity} = R${item.subtotal.toFixed(2)}`)
        .join('\n');

      const message = `
✅ *Order Confirmed!*
━━━━━━━━━━━━━━━━━━━━
📦 Order #${order.orderNumber}
${itemsList}
━━━━━━━━━━━━━━━━━━━━
💰 *Total: R${order.total.toFixed(2)}*

Tap the button below to complete payment:
      `.trim();

      const payload = {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: {
            text: message,
          },
          action: {
            buttons: [
              {
                type: 'url',
                url: {
                  display_text: '🔗 Pay Now',
                  url: paymentLink,
                },
              },
            ],
          },
        },
      };

      const response = await axios.post(
        `${this.baseURL}/${this.phoneId}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      logger.info('WhatsApp payment link sent', { to: phone, orderId: order._id });
      return response.data.messages[0];
    } catch (error) {
      logger.error('WhatsApp payment link failed', {
        to: toPhone,
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  /**
   * Send invoice via WhatsApp
   */
  async sendInvoice(toPhone, order, invoicePdfUrl) {
    try {
      const phone = toPhone.replace(/^\+/, '').replace(/\s/g, '');

      const message = `
✅ *Payment Successful!*
━━━━━━━━━━━━━━━━━━━━
📄 Invoice: ${order.orderNumber}
💰 Amount: R${order.total.toFixed(2)}
📅 Date: ${new Date().toLocaleDateString()}

Your invoice has been attached. Thank you for your purchase!
      `.trim();

      // Send text first
      await this.sendMessage(toPhone, message);

      // Then send document
      const payload = {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'document',
        document: {
          link: invoicePdfUrl,
          caption: `Invoice ${order.orderNumber}`,
        },
      };

      const response = await axios.post(
        `${this.baseURL}/${this.phoneId}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      logger.info('WhatsApp invoice sent', { to: phone, orderId: order._id });
      return response.data.messages[0];
    } catch (error) {
      logger.error('WhatsApp invoice send failed', {
        to: toPhone,
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  /**
   * Send low stock alert to business owner
   */
  async sendLowStockAlert(toPhone, product) {
    try {
      const message = `
⚠️ *Low Stock Alert*
━━━━━━━━━━━━━━━━━━━━
📦 Product: ${product.name}
📍 Current Stock: ${product.stock.quantity}
🚨 Threshold: ${product.stock.lowStockThreshold}

Consider restocking this product soon!
      `.trim();

      await this.sendMessage(toPhone, message);
      logger.info('Low stock alert sent', { to: toPhone, product: product._id });
    } catch (error) {
      logger.error('Low stock alert failed', { to: toPhone, error: error.message });
    }
  }

  /**
   * Helper: Extract phone number from webhook
   */
  extractPhoneFromWebhook(webhookData) {
    return webhookData.from || null;
  }

  /**
   * Helper: Extract message text from webhook
   */
  extractMessageText(webhookData) {
    if (webhookData.type === 'text') {
      return webhookData.text?.body || '';
    }
    if (webhookData.type === 'interactive') {
      return webhookData.interactive?.button_reply?.id || 
             webhookData.interactive?.list_reply?.id || '';
    }
    return '';
  }

  /**
   * Helper: Parse interactive button/list reply
   */
  parseInteractiveReply(webhookData) {
    const interactive = webhookData.interactive;
    
    if (interactive?.button_reply) {
      return {
        type: 'button',
        id: interactive.button_reply.id,
        text: interactive.button_reply.title,
      };
    }

    if (interactive?.list_reply) {
      return {
        type: 'list',
        id: interactive.list_reply.id,
        text: interactive.list_reply.title,
      };
    }

    return null;
  }

  // Send payment confirmation
  async sendPaymentConfirmation(to, amount, reference, currency = 'ZAR') {
    const message = `✅ Payment Successful!\n\nAmount: ${currency} ${amount}\nReference: ${reference}\n\nThank you for your payment!`;
    return this.sendMessage(to, message);
  }

  // Send order confirmation
  async sendOrderConfirmation(to, orderNumber, total, items) {
    let message = `🛍️ Order Confirmed!\n\nOrder #: ${orderNumber}\nTotal: R${total}\n\nItems:\n`;
    
    items.forEach((item, index) => {
      message += `${index + 1}. ${item.name} (x${item.quantity})\n`;
    });
    
    message += '\nWe will notify you when your order is shipped.';
    
    return this.sendMessage(to, message);
  }

  // Send invoice
  async sendInvoice(to, invoiceNumber, total, pdfUrl) {
    const message = `📄 Invoice #${invoiceNumber}\n\nAmount Due: R${total}\n\nView invoice: ${pdfUrl}\n\nThank you!`;
    return this.sendMessage(to, message);
  }

  // Process incoming webhook message
  async processIncomingMessage(webhookData) {
    try {
      const entry = webhookData.entry?.[0];
      const change = entry?.changes?.[0];
      const message = change?.value?.messages?.[0];

      if (!message) return null;

      const from = message.from;
      const messageText = message.text?.body || '';
      const messageType = message.type;

      logger.info('Processing incoming WhatsApp message', { from, messageText, messageType });

      // Find or create customer
      let customer = await Customer.findOne({ whatsappNumber: `+${from}` });
      
      if (!customer) {
        // Auto-create customer
        customer = await Customer.create({
          userId: null, // Will be linked when they interact with a user
          name: `Customer ${from.slice(-4)}`,
          whatsappNumber: `+${from}`,
        });
      }

      // Check for automated flows
      await this.triggerFlows('keyword', messageText, customer, from);

      return { customer, message: messageText, from };
    } catch (error) {
      logger.error('Error processing incoming message:', error);
      throw error;
    }
  }

  // Trigger automated flows
  async triggerFlows(trigger, triggerValue, customer, phoneNumber) {
    try {
      const flows = await WhatsAppFlow.find({
        trigger,
        isActive: true,
      });

      for (const flow of flows) {
        // Check if trigger matches
        if (trigger === 'keyword') {
          const keywords = flow.triggerValue?.split(',').map(k => k.trim().toLowerCase());
          const messageWords = triggerValue.toLowerCase().split(' ');
          
          const hasMatch = keywords?.some(keyword => 
            messageWords.includes(keyword)
          );

          if (hasMatch) {
            await this.executeFlow(flow, customer, phoneNumber);
          }
        } else if (trigger === flow.trigger) {
          await this.executeFlow(flow, customer, phoneNumber);
        }
      }
    } catch (error) {
      logger.error('Error triggering flows:', error);
    }
  }

  // Execute a flow
  async executeFlow(flow, customer, phoneNumber) {
    try {
      logger.info(`Executing flow: ${flow.name}`, { flowId: flow._id, customer: customer._id });

      let currentStep = flow.steps.find(s => s.stepId === flow.startStep);
      
      while (currentStep) {
        if (currentStep.type === 'message') {
          await this.sendMessage(phoneNumber, currentStep.content);
        } else if (currentStep.type === 'question') {
          await this.sendMessage(phoneNumber, currentStep.content);
          // In a real implementation, you'd wait for user response
          break;
        } else if (currentStep.type === 'action') {
          await this.executeAction(currentStep.action, currentStep.actionParams, customer);
        }

        // Move to next step
        if (currentStep.nextStep) {
          currentStep = flow.steps.find(s => s.stepId === currentStep.nextStep);
        } else {
          break;
        }
      }

      // Update usage count
      flow.usageCount += 1;
      await flow.save();

      logger.info(`Flow completed: ${flow.name}`, { flowId: flow._id });
    } catch (error) {
      logger.error('Error executing flow:', error);
    }
  }

  // Execute flow action
  async executeAction(action, params, customer) {
    try {
      switch (action) {
        case 'update_customer':
          if (params.updates) {
            await Customer.findByIdAndUpdate(customer._id, params.updates);
          }
          break;
        
        case 'send_payment_link':
          // Integration with payment service
          logger.info('Send payment link action', { customerId: customer._id });
          break;
        
        case 'notify_admin':
          // Send notification to admin
          logger.info('Notify admin action', { customerId: customer._id, message: params.message });
          break;
        
        default:
          logger.warn(`Unknown action: ${action}`);
      }
    } catch (error) {
      logger.error('Error executing action:', error);
    }
  }

  // Create or update flow
  async createFlow(userId, flowData) {
    try {
      const flow = await WhatsAppFlow.create({
        userId,
        ...flowData,
      });

      logger.info(`WhatsApp flow created: ${flow.name}`, { userId, flowId: flow._id });
      return flow;
    } catch (error) {
      logger.error('Error creating flow:', error);
      throw error;
    }
  }

  // Get flows for user
  async getFlows(userId, filters = {}) {
    try {
      const query = { userId, ...filters };
      const flows = await WhatsAppFlow.find(query).sort({ createdAt: -1 });
      return flows;
    } catch (error) {
      logger.error('Error fetching flows:', error);
      throw error;
    }
  }
}

export default new WhatsAppService();
