import { Schema, model, models } from 'mongoose';

const InvoiceSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
    invoiceNumber: { type: String, unique: true, required: true },
    invoiceDate: { type: Date, default: Date.now },
    dueDate: { type: Date },
    items: [
      {
        description: { type: String, required: true },
        quantity: { type: Number, required: true },
        unitPrice: { type: Number, required: true },
        total: { type: Number, required: true },
      },
    ],
    subtotal: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    currency: { type: String, default: 'ZAR' },
    status: {
      type: String,
      enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
      default: 'draft',
    },
    pdfUrl: { type: String },
    notes: { type: String, default: '' },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Indexes
InvoiceSchema.index({ userId: 1, status: 1 });
InvoiceSchema.index({ customerId: 1 });
InvoiceSchema.index({ invoiceNumber: 1 });
InvoiceSchema.index({ invoiceDate: -1 });

// Pre-save middleware to generate invoice number
InvoiceSchema.pre('save', async function (next) {
  if (!this.invoiceNumber) {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 4).toUpperCase();
    this.invoiceNumber = `INV-${year}-${timestamp}-${random}`;
  }
  next();
});

export default models.Invoice || model('Invoice', InvoiceSchema);
