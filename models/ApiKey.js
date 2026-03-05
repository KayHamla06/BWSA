import { Schema, model, models } from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const ApiKeySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    keyHash: { type: String, required: true }, // Hashed API key
    keyPrefix: { type: String, required: true }, // First 8 chars for identification
    name: { type: String, default: 'Default API Key' },
    usageCount: { type: Number, default: 0 },
    monthlyLimit: { type: Number, default: 1000 },
    lastUsed: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    permissions: {
      type: [String],
      default: ['read', 'write'],
      enum: ['read', 'write', 'delete', 'admin'],
    },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Indexes
ApiKeySchema.index({ userId: 1, isActive: 1 });
ApiKeySchema.index({ keyPrefix: 1 });

// Static method to generate new API key
ApiKeySchema.statics.generateKey = async function (userId, name = 'Default API Key') {
  // Generate a secure random API key  const rawKey = `cc_${crypto.randomBytes(32).toString('hex')}`;
  const keyPrefix = rawKey.substring(0, 8);
  
  // Hash the key before storing
  const salt = await bcrypt.genSalt(10);
  const keyHash = await bcrypt.hash(rawKey, salt);

  const apiKey = await this.create({
    userId,
    name,
    keyHash,
    keyPrefix,
  });

  // Return the raw key only once (never stored)
  return { apiKey, rawKey };
};

// Method to verify API key
ApiKeySchema.methods.verifyKey = async function (rawKey) {
  return await bcrypt.compare(rawKey, this.keyHash);
};

// Method to check if key is expired
ApiKeySchema.methods.isExpired = function () {
  return this.expiresAt && new Date() > this.expiresAt;
};

export default models.ApiKey || model('ApiKey', ApiKeySchema);