import mongoose from 'mongoose';
import crypto from 'crypto';

const { Schema, model, models } = mongoose;

const SellerPaymentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    paymentFlow: {
      type: String,
      enum: ['ubuntu_pay', 'payfast_direct'],
      default: 'ubuntu_pay',
    },
    payfastMerchantId: { type: String, default: '' },
    payfastMerchantKey: { type: String, default: '' },
    payfastPassphrase: { type: String, default: '' },
    payfastReturnUrl: { type: String, default: '' },
    payfastCancelUrl: { type: String, default: '' },
    bankName: { type: String, default: '' },
    accountHolder: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    accountType: { type: String, default: '' },
    payshapId: { type: String, default: '' },
    qrPaymentDetails: { type: String, default: '' },
    capitecNumber: { type: String, default: '' },
    capitecSurname: { type: String, default: '' },
    isConfigured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

SellerPaymentSchema.pre('save', function (next) {
  const hasDirectPayfast = Boolean(this.payfastMerchantId && this.payfastMerchantKey);
  const hasUbuntuPayPayoutDetails = Boolean(
    (this.bankName && this.accountNumber && this.accountHolder)
      || this.payshapId
      || this.qrPaymentDetails
      || this.capitecNumber
  );

  this.isConfigured = this.paymentFlow === 'payfast_direct' ? hasDirectPayfast : hasUbuntuPayPayoutDetails;
  next();
});

export default models.SellerPayment || model('SellerPayment', SellerPaymentSchema);
