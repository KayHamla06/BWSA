import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const LedgerEntrySchema = new Schema(
  {
    ledgerId: { type: String, required: true, unique: true, index: true },
    transactionId: { type: String, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    accountFrom: { type: String, required: true, index: true },
    accountTo: { type: String, required: true, index: true },
    amount: { type: Number, required: true, min: 0.01 },
    reference: { type: String, default: '' },
    transactionType: {
      type: String,
      enum: ['payment_credit', 'withdrawal_debit', 'refund', 'adjustment'],
      required: true,
      index: true,
    },
    timestamp: { type: Date, default: Date.now, index: true },
    signatureHash: { type: String, required: true },
  },
  { timestamps: true }
);

LedgerEntrySchema.index({ userId: 1, timestamp: -1 });
LedgerEntrySchema.index({ userId: 1, transactionType: 1, timestamp: -1 });
LedgerEntrySchema.index({ transactionId: 1, transactionType: 1 }, { unique: true });

export default models.LedgerEntry || model('LedgerEntry', LedgerEntrySchema);