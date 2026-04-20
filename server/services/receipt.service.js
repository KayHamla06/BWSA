import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import cloudinary from '../../config/cloudinary.js';
import Receipt from '../models/Receipt.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..', '..');
const logoPath = path.join(rootDir, 'assets', 'logo.png');

function createReceiptBuffer(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 45, { width: 120 });
    }

    doc
      .fontSize(20)
      .text('Ubuntu Market Receipt', 50, 120)
      .moveDown(1.2)
      .fontSize(11)
      .text(`Receipt ID: ${data.receiptId}`)
      .text(`Order Number: ${data.orderNumber}`)
      .text(`Date: ${new Date(data.createdAt).toLocaleString('en-ZA')}`)
      .moveDown(1)
      .text(`Seller: ${data.sellerName}`)
      .text(`Customer Phone: ${data.customerPhone}`)
      .moveDown(1)
      .text(`Product: ${data.productName}`)
      .text(`Description: ${data.productDescription || 'N/A'}`)
      .text(`Price: R${Number(data.amount).toFixed(2)}`)
      .text(`Transaction ID: ${data.transactionId}`)
      .text(`Payment Status: ${data.paymentStatus}`)
      .moveDown(1.5)
      .fontSize(10)
      .fillColor('#666')
      .text('Thank you for shopping with Ubuntu Market.', { align: 'left' });

    doc.end();
  });
}

async function uploadReceiptPdf(pdfBuffer, receiptId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'receipts',
        resource_type: 'raw',
        public_id: receiptId,
        overwrite: true,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(pdfBuffer);
  });
}

export async function generateReceiptAndStore({
  seller,
  order,
  payment,
  paymentStatus,
  transactionId,
}) {
  const receiptId = `RCT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  const payload = {
    receiptId,
    orderNumber: order.paymentReference || String(order._id),
    createdAt: new Date(),
    sellerName: seller.businessName || seller.name,
    customerPhone: order.customerPhone,
    productName: order.productSnapshot?.name || 'Product',
    productDescription: order.productSnapshot?.description || '',
    amount: order.amount,
    transactionId,
    paymentStatus,
  };

  const pdfBuffer = await createReceiptBuffer(payload);
  const uploaded = await uploadReceiptPdf(pdfBuffer, receiptId);

  const receipt = await Receipt.create({
    receiptId,
    sellerId: seller._id,
    customerPhone: order.customerPhone,
    orderId: order._id,
    paymentId: payment?._id,
    transactionId,
    paymentStatus,
    amount: order.amount,
    pdfUrl: uploaded.url,
    cloudinaryPublicId: uploaded.publicId,
  });

  return { receipt, pdfUrl: uploaded.url, receiptId };
}

export const receiptService = {
  generateReceiptAndStore,
};
