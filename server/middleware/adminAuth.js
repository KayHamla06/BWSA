import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';

/**
 * Authenticate admin requests via JWT Bearer token.
 */
export function authenticateAdmin(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Admin authentication required' });
  }

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access denied' });
    }
    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired admin token' });
  }
}

/**
 * Generate a JWT token for admin users.
 */
export function generateAdminToken(admin) {
  return jwt.sign(
    { adminId: admin._id, email: admin.email, role: admin.role, isAdmin: true },
    process.env.JWT_SECRET,
    { expiresIn: '4h' }
  );
}
