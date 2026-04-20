import { Router } from 'express';
import { authenticateAdmin } from '../middleware/adminAuth.js';
import { adminLogin, adminProfile } from '../controllers/admin.auth.controller.js';
import {
  getAdminStats,
  getAllUsers,
  getUserDetail,
  getAllCustomers,
  getCustomerDetail,
  getAllOrders,
  getAllPayments,
  updateUserStatus,
  deleteUser,
  getRecentActivity,
} from '../controllers/admin.dashboard.controller.js';

const router = Router();

// ── Auth (public) ──
router.post('/auth/login', adminLogin);

// ── Protected routes ──
router.use(authenticateAdmin);

router.get('/auth/profile', adminProfile);
router.get('/dashboard/stats', getAdminStats);
router.get('/dashboard/users', getAllUsers);
router.get('/dashboard/users/:id', getUserDetail);
router.patch('/dashboard/users/:id/status', updateUserStatus);
router.delete('/dashboard/users/:id', deleteUser);
router.get('/dashboard/customers', getAllCustomers);
router.get('/dashboard/customers/:id', getCustomerDetail);
router.get('/dashboard/orders', getAllOrders);
router.get('/dashboard/payments', getAllPayments);
router.get('/dashboard/recent-activity', getRecentActivity);

export default router;
