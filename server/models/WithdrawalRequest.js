import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const WithdrawalRequestSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, default: 'ZAR' },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'rejected', 'cancelled'],
      default: 'pending',
    },
    ledgerTransactionId: { type: String, default: '', index: true },
    payoutMethod: {
      type: String,
      enum: ['immediate', 'bank', 'payshap', 'qr', 'capitec'],
      required: true,
    },
    destination: {
      bankName: { type: String, default: '' },
      accountHolder: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      accountType: { type: String, default: '' },
      payshapId: { type: String, default: '' },
      qrPaymentDetails: { type: String, default: '' },
      capitecNumber: { type: String, default: '' },
      capitecSurname: { type: String, default: '' },
    },
    requestedAt: { type: Date, default: Date.now },
    processedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    disclaimerAccepted: { type: Boolean, default: false },
    disclaimerAcceptedAt: { type: Date, default: null },
    processingMessage: {
      type: String,
      default: 'Still processing funds. Funds may take 30 minutes to 1 hour to reflect in your bank account.',
    },
    adminNotes: { type: String, default: '' },
  },
  { timestamps: true }
);

WithdrawalRequestSchema.index({ userId: 1, status: 1, createdAt: -1 });
WithdrawalRequestSchema.index({ ledgerTransactionId: 1 });

export default models.WithdrawalRequest || model('WithdrawalRequest', WithdrawalRequestSchema);