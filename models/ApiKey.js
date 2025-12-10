import { Schema, model, models } from 'mongoose';
import crypto from 'crypto';

const ApiKeySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    key: { type: String, unique: true, default: () => crypto.randomUUID() },
    name: { type: String, default: 'Default API Key' },
    usageCount: { type: Number, default: 0 },
    monthlyLimit: { type: Number, default: 1000 },
    lastUsed: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default models.ApiKey || model('ApiKey', ApiKeySchema);