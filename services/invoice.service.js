// services/invoice.service.js
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import Invoice from '../models/Invoice.js';
import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.middleware.js';
import whatsappService from './whatsapp.service.js';

class InvoiceService {
  constructor() {
    this.invoiceDir = path.join(process.cwd(), 'invoices');
    // Ensure invoice directory exists
    if (!fs.existsSync(this.invoiceDir)) {
      fs.mkdirSync(this.invoiceDir, { recursive: true });
    }
  }

  // Create invoice from order
  async createInvoiceFromOrder(orderId, userId) {
    try {
      const order = await Order.findOne({ _id: orderId, userId })
        .populate('customerId')
        .populate('userId');

      if (!order) {
        throw new AppError('Order not found', 404);
      }

      // Check if invoice already exists
      let invoice = await Invoice.findOne({ orderId });
      
      if (invoice) {
        return invoice;
      }

      // Create invoice items from order
      const invoiceItems = order.items.map(item => ({
        description: `${item.name} (x${item.quantity})`,
        quantity: item.quantity,
        unitPrice: item.price,
        total: item.subtotal,
      }));

      // Create invoice
      invoice = await Invoice.create({
        userId,
        customerId: order.customerId._id,
        orderId: order._id,
        paymentId: order.paymentId,
        items: invoiceItems,
        subtotal: order.subtotal,
        tax: order.tax,
        discount: order.discount,
        total: order.total,
        currency: order.currency,
        status: order.paymentStatus === 'paid' ? 'paid' : 'sent',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        notes: order.notes,
      });

      // Generate PDF
      const pdfPath = await this.generatePDF(invoice._id, userId);
      invoice.pdfUrl = pdfPath;
      await invoice.save();

      logger.info('Invoice created from order', {
        invoiceId: invoice._id,
        orderId,
        userId,
      });

      return invoice;
    } catch (error) {
      logger.error('Error creating invoice from order:', error);
      throw error;
    }
  }

  // Create standalone invoice
  async createInvoice(userId, invoiceData) {
    try {
      const { customerId, items, dueDate, notes } = invoiceData;

      // Verify customer
      const customer = await Customer.findOne({ _id: customerId, userId });
      if (!customer) {
        throw new AppError('Customer not found', 404);
      }

      // Calculate totals
      let subtotal = 0;
      items.forEach(item => {
        item.total = item.quantity * item.unitPrice;
        subtotal += item.total;
      });

      const tax = subtotal * 0.15; // 15% VAT
      const discount = invoiceData.discount || 0;
      const total = subtotal + tax - discount;

      // Create invoice
      const invoice = await Invoice.create({
        userId,
        customerId,
        items,
        subtotal,
        tax,
        discount,
        total,
        dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        notes,
      });

      // Generate PDF
      const pdfPath = await this.generatePDF(invoice._id, userId);
      invoice.pdfUrl = pdfPath;
      await invoice.save();

      logger.info('Invoice created', { invoiceId: invoice._id, userId });

      return invoice;
    } catch (error) {
      logger.error('Error creating invoice:', error);
      throw error;
    }
  }

  // Generate PDF invoice
  async generatePDF(invoiceId, userId) {
    try {
      const invoice = await Invoice.findOne({ _id: invoiceId, userId })
        .populate('customerId')
        .populate('userId');

      if (!invoice) {
        throw new AppError('Invoice not found', 404);
      }

      const filename = `invoice-${invoice.invoiceNumber}.pdf`;
      const filepath = path.join(this.invoiceDir, filename);

      return new Promise((resolve, reject) => {
        try {
          const doc = new PDFDocument({ margin: 50, size: 'A4' });
          const stream = fs.createWriteStream(filepath);

          doc.pipe(stream);

          // Header
          this.addHeader(doc, invoice);

          // Business & Customer Info
          this.addBusinessInfo(doc, invoice.userId, 70);
          this.addCustomerInfo(doc, invoice.customerId, 70);

          // Invoice Details
          this.addInvoiceDetails(doc, invoice, 200);

          // Items Table
          this.addItemsTable(doc, invoice, 280);

          // Totals
          this.addTotals(doc, invoice, doc.y + 20);

          // Footer
          this.addFooter(doc, invoice);

          doc.end();

          stream.on('finish', () => {
            logger.info('PDF generated', { invoiceId, filepath });
            resolve(`/invoices/${filename}`);
          });

          stream.on('error', (error) => {
            logger.error('PDF generation error:', error);
            reject(error);
          });
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      logger.error('Error generating PDF:', error);
      throw error;
    }
  }

  // PDF Helper Methods
  addHeader(doc, invoice) {
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('INVOICE', 50, 50, { align: 'right' })
      .moveDown();
  }

  addBusinessInfo(doc, business, y) {
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text(business.businessName, 50, y)
      .font('Helvetica')
      .fontSize(10)
      .text(business.email, 50, y + 15)
      .text(business.whatsappNumber, 50, y + 30);
  }

  addCustomerInfo(doc, customer, y) {
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Bill To:', 350, y)
      .font('Helvetica')
      .text(customer.name, 350, y + 15)
      .text(customer.email || '', 350, y + 30)
      .text(customer.whatsappNumber, 350, y + 45);
  }

  addInvoiceDetails(doc, invoice, y) {
    const formatDate = (date) => {
      return new Date(date).toLocaleDateString('en-ZA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Invoice Number:', 50, y)
      .font('Helvetica')
      .text(invoice.invoiceNumber, 150, y)
      .font('Helvetica-Bold')
      .text('Invoice Date:', 50, y + 15)
      .font('Helvetica')
      .text(formatDate(invoice.invoiceDate), 150, y + 15)
      .font('Helvetica-Bold')
      .text('Due Date:', 50, y + 30)
      .font('Helvetica')
      .text(formatDate(invoice.dueDate), 150, y + 30)
      .font('Helvetica-Bold')
      .text('Status:', 50, y + 45)
      .font('Helvetica')
      .text(invoice.status.toUpperCase(), 150, y + 45);
  }

  addItemsTable(doc, invoice, y) {
    const tableTop = y;
    const itemCodeX = 50;
    const descriptionX = 100;
    const quantityX = 350;
    const priceX = 420;
    const amountX = 490;

    // Table Header
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('#', itemCodeX, tableTop)
      .text('Description', descriptionX, tableTop)
      .text('Qty', quantityX, tableTop)
      .text('Price', priceX, tableTop)
      .text('Amount', amountX, tableTop);

    // Line under header
    doc
      .moveTo(50, tableTop + 15)
      .lineTo(550, tableTop + 15)
      .stroke();

    // Table Rows
    let position = tableTop + 25;
    doc.font('Helvetica').fontSize(9);

    invoice.items.forEach((item, index) => {
      doc
        .text(index + 1, itemCodeX, position)
        .text(item.description, descriptionX, position, { width: 230 })
        .text(item.quantity, quantityX, position)
        .text(`R${item.unitPrice.toFixed(2)}`, priceX, position)
        .text(`R${item.total.toFixed(2)}`, amountX, position);

      position += 25;
    });

    return position;
  }

  addTotals(doc, invoice, y) {
    const labelX = 380;
    const valueX = 490;

    doc
      .fontSize(10)
      .font('Helvetica')
      .text('Subtotal:', labelX, y)
      .text(`R${invoice.subtotal.toFixed(2)}`, valueX, y)
      .text('Tax (15%):', labelX, y + 20)
      .text(`R${invoice.tax.toFixed(2)}`, valueX, y + 20);

    if (invoice.discount > 0) {
      doc
        .text('Discount:', labelX, y + 40)
        .text(`-R${invoice.discount.toFixed(2)}`, valueX, y + 40);
      y += 20;
    }

    doc
      .moveTo(380, y + 60)
      .lineTo(550, y + 60)
      .stroke()
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('TOTAL:', labelX, y + 70)
      .text(`R${invoice.total.toFixed(2)}`, valueX, y + 70);
  }

  addFooter(doc, invoice) {
    if (invoice.notes) {
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Notes:', 50, 650)
        .font('Helvetica')
        .fontSize(9)
        .text(invoice.notes, 50, 665, { width: 500 });
    }

    doc
      .fontSize(8)
      .font('Helvetica')
      .text('Thank you for your business!', 50, 750, { align: 'center' });
  }

  // Send invoice via WhatsApp
  async sendInvoice(invoiceId, userId) {
    try {
      const invoice = await Invoice.findOne({ _id: invoiceId, userId })
        .populate('customerId');

      if (!invoice) {
        throw new AppError('Invoice not found', 404);
      }

      if (!invoice.pdfUrl) {
        await this.generatePDF(invoiceId, userId);
        await invoice.reload();
      }

      const pdfUrl = `${process.env.APP_URL}${invoice.pdfUrl}`;

      await whatsappService.sendInvoice(
        invoice.customerId.whatsappNumber,
        invoice.invoiceNumber,
        invoice.total,
        pdfUrl
      );

      invoice.status = 'sent';
      await invoice.save();

      logger.info('Invoice sent via WhatsApp', { invoiceId, userId });

      return invoice;
    } catch (error) {
      logger.error('Error sending invoice:', error);
      throw error;
    }
  }

  // Get invoices with filters
  async getInvoices(userId, filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 20, status, customerId, startDate, endDate } = { ...filters, ...pagination };
      
      const query = { userId };
      
      if (status) query.status = status;
      if (customerId) query.customerId = customerId;
      if (startDate || endDate) {
        query.invoiceDate = {};
        if (startDate) query.invoiceDate.$gte = new Date(startDate);
        if (endDate) query.invoiceDate.$lte = new Date(endDate);
      }

      const skip = (page - 1) * limit;
      
      const [invoices, total] = await Promise.all([
        Invoice.find(query)
          .populate('customerId', 'name email whatsappNumber')
          .sort({ invoiceDate: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Invoice.countDocuments(query),
      ]);

      return {
        invoices,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error fetching invoices:', error);
      throw error;
    }
  }

  // Mark invoice as paid
  async markAsPaid(invoiceId, userId) {
    try {
      const invoice = await Invoice.findOneAndUpdate(
        { _id: invoiceId, userId },
        { status: 'paid' },
        { new: true }
      );

      if (!invoice) {
        throw new AppError('Invoice not found', 404);
      }

      logger.info('Invoice marked as paid', { invoiceId, userId });

      return invoice;
    } catch (error) {
      logger.error('Error marking invoice as paid:', error);
      throw error;
    }
  }
}

export default new InvoiceService();
