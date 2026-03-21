/**
 * Admin Seed Script
 * 
 * Creates the initial admin account. The password is derived from
 * the JWT_SECRET so it is unique to each deployment.
 * 
 * Run: node server/scripts/seedAdmin.js
 * 
 * Default credentials:
 *   Email: admin@ubuntumarket.co.za
 *   Password: Generated from JWT_SECRET (printed on first run)
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..', '..');

dotenv.config({ path: path.join(rootDir, '.env.local') });
dotenv.config({ path: path.join(rootDir, '.env') });

import { connectDB } from '../../config/database.js';
import Admin from '../models/Admin.js';

async function seed() {
  await connectDB();

  const existingAdmin = await Admin.findOne({ email: 'admin@ubuntumarket.co.za' });
  if (existingAdmin) {
    console.log('✅ Admin already exists:');
    console.log(`   Email: ${existingAdmin.email}`);
    console.log('   Password: (the one generated on first run — see below for reset)');
    console.log('\n   To reset, delete the admin and re-run this script.');
    process.exit(0);
  }

  // Derive password from JWT_SECRET using HMAC — unique per environment
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('❌ JWT_SECRET is not set in environment variables.');
    process.exit(1);
  }

  const derived = crypto.createHmac('sha256', jwtSecret).update('admin-password-seed').digest('hex');
  // Take first 16 chars and mix in special chars for a strong, memorable password
  const adminPassword = derived.slice(0, 12) + 'A1!';

  const admin = await Admin.create({
    name: 'Super Admin',
    email: 'admin@ubuntumarket.co.za',
    password: adminPassword,
    role: 'super_admin',
  });

  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║        🔐 ADMIN ACCOUNT CREATED SUCCESSFULLY     ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Email:    admin@ubuntumarket.co.za              ║`);
  console.log(`║  Password: ${adminPassword.padEnd(37)}║`);
  console.log(`║  Role:     super_admin                           ║`);
  console.log('╠══════════════════════════════════════════════════╣');
  console.log('║  ⚠️  SAVE THIS PASSWORD — it cannot be recovered ║');
  console.log('║  Login at: /admin/login                          ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');

  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
