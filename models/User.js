// models/User.js
import { Schema, model } from 'mongoose';

const UserSchema = new Schema({
  businessName: String,
  email: String,
  shapId: String,           // Their phone number for YOUR billing
  apiKey: { type: String, unique: true },
  plan: { type: String, enum: ['basic', 'pro', 'payperuse'], default: 'payperuse' },
  status: { type: String, default: 'pending' }, // pending → active → suspended
  usage: { transactions: { type: Number, default: 0 } },
  createdAt: { type: Date, default: Date.now },
});

export default model('User', UserSchema);