import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const AuditLogSchema = new Schema(
  {
    logId: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actionType: {
      type: String,
      enum: [
        'withdrawal',
        'admin_adjustment',
        'payment_confirmation',
        'wallet_update',
        'security_alert',
      ],
      required: true,
      index: true,
    },
    description: { type: String, required: true },
    ipAddress: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

AuditLogSchema.index({ userId: 1, actionType: 1, timestamp: -1 });

export default models.AuditLog || model('AuditLog', AuditLogSchema);