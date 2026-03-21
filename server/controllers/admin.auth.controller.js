import Admin from '../models/Admin.js';
import { generateAdminToken } from '../middleware/adminAuth.js';
import { ApiError } from '../errors/ApiError.js';

/**
 * POST /api/admin/auth/login
 */
export async function adminLogin(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw ApiError.badRequest('Email and password are required');
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (!admin.isActive) {
      throw ApiError.forbidden('This admin account is deactivated');
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    admin.lastLogin = new Date();
    await admin.save();

    const token = generateAdminToken(admin);

    res.json({
      success: true,
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/auth/profile
 */
export async function adminProfile(req, res, next) {
  try {
    const admin = await Admin.findById(req.admin.adminId).select('-password');
    if (!admin) throw ApiError.notFound('Admin not found');

    res.json({ success: true, admin });
  } catch (error) {
    next(error);
  }
}
