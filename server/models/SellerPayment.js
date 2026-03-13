import mongoose from 'mongoose';
import crypto from 'crypto';

const { Schema, model, models } = mongoose;

const SellerPaymentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    ozowMerchantId: { type: String, default: '' },
    ozowApiKey: { type: String, default: '' },
    ozowPrivateKey: { type: String, default: '' },
    ozowSiteCode: { type: String, default: '' },
    bankName: { type: String, default: '' },
    accountHolder: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    accountType: { type: String, default: '' },
    isConfigured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Encrypt sensitive fields before save
SellerPaymentSchema.pre('save', function (next) {
  if (this.ozowApiKey && this.ozowPrivateKey && this.ozowSiteCode) {
    this.isConfigured = true;
  }
  next();
});

export default models.SellerPayment || model('SellerPayment', SellerPaymentSchema);
