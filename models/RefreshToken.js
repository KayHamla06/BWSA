import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const RefreshTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    isRevoked: { type: Boolean, default: false },
    deviceInfo: {
      userAgent: String,
      ip: String,
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Index for automatic cleanup of expired tokens
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
RefreshTokenSchema.index({ userId: 1, isRevoked: 1 });

export default models.RefreshToken || model('RefreshToken', RefreshTokenSchema);
