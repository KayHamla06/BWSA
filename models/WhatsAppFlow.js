import { Schema, model, models } from 'mongoose';

const FlowStepSchema = new Schema({
  stepId: { type: String, required: true },
  type: {
    type: String,
    enum: ['message', 'question', 'condition', 'action'],
    required: true,
  },
  content: { type: String },
  options: [String],
  nextStep: { type: String },
  conditions: [
    {
      field: String,
      operator: String,
      value: Schema.Types.Mixed,
      nextStep: String,
    },
  ],
  action: {
    type: String,
    enum: ['create_order', 'send_payment_link', 'send_invoice', 'update_customer', 'notify_admin'],
  },
  actionParams: { type: Schema.Types.Mixed },
});

const WhatsAppFlowSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    trigger: {
      type: String,
      enum: ['keyword', 'new_customer', 'payment_received', 'order_created', 'manual'],
      required: true,
    },
    triggerValue: { type: String }, // e.g., keyword to match
    isActive: { type: Boolean, default: true },
    steps: [FlowStepSchema],
    startStep: { type: String, required: true },
    usageCount: { type: Number, default: 0 },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Indexes
WhatsAppFlowSchema.index({ userId: 1, isActive: 1 });
WhatsAppFlowSchema.index({ trigger: 1, triggerValue: 1 });

export default models.WhatsAppFlow || model('WhatsAppFlow', WhatsAppFlowSchema);
