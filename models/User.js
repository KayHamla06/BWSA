import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;
import bcrypt from 'bcryptjs';

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    businessName: { type: String, required: true },
    businessDescription: { type: String, default: '' },
    whatsappNumber: { type: String, required: true },
    logo: { type: String, default: null },
    plan: {
      type: String,
      enum: ['free', 'basic', 'pro', 'enterprise'],
      default: 'free',
    },
    payoutInfo: {
      bankName: String,
      accountHolder: String,
      accountNumber: String,
      accountType: String,
    },
    supportEmail: { type: String, default: '' },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, default: null },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String, default: null },
    status: {
      type: String,
      enum: ['active', 'suspended', 'inactive'],
      default: 'active',
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Hash password before save
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default models.User || model('User', UserSchema);