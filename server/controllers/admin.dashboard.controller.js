import User from '../models/User.js';
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import Product from '../models/Product.js';
import UserSubscription from '../models/UserSubscription.js';
import WithdrawalRequest from '../models/WithdrawalRequest.js';
import Campaign from '../models/Campaign.js';
import Coupon from '../models/Coupon.js';
import Receipt from '../models/Receipt.js';
import LedgerEntry from '../models/LedgerEntry.js';
import AuditLog from '../models/AuditLog.js';
import Analytics from '../models/Analytics.js';
import TransactionLog from '../models/TransactionLog.js';
import SellerPayment from '../models/SellerPayment.js';
import UbuntuPayAccount from '../models/UbuntuPayAccount.js';
import { ApiError } from '../errors/ApiError.js';

/**
 * GET /api/admin/dashboard/stats
 * Platform-wide overview stats for the admin.
 */
export async function getAdminStats(req, res, next) {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      activeUsers,
      totalCustomers,
      totalOrders,
      ordersToday,
      totalPayments,
      completedPayments,
      pendingWithdrawals,
      totalProducts,
      revenueResult,
      revenueToday,
      revenueMonth,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: 'active' }),
      Customer.countDocuments(),
      Order.countDocuments(),
      Order.countDocuments({ createdAt: { $gte: todayStart } }),
      Payment.countDocuments(),
      Payment.countDocuments({ status: 'completed' }),
      WithdrawalRequest.countDocuments({ status: 'pending' }),
      Product.countDocuments(),
      Payment.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Payment.aggregate([
        { $match: { status: 'completed', paidAt: { $gte: todayStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Payment.aggregate([
        { $match: { status: 'completed', paidAt: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        suspendedUsers: totalUsers - activeUsers,
        totalCustomers,
        totalOrders,
        ordersToday,
        totalPayments,
        completedPayments,
        failedPayments: totalPayments - completedPayments,
        pendingWithdrawals,
        totalProducts,
        totalRevenue: revenueResult[0]?.total || 0,
        revenueToday: revenueToday[0]?.total || 0,
        revenueMonth: revenueMonth[0]?.total || 0,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/dashboard/users
 * List all sellers/users with their subscription info.
 */
export async function getAllUsers(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const search = req.query.search || '';
    const status = req.query.status || '';

    const filter = {};
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
        { businessName: { $regex: escaped, $options: 'i' } },
      ];
    }
    if (status) filter.status = status;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password -verificationPin -twoFactorSecret')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    // Enrich with subscription data
    const userIds = users.map((u) => u._id);
    const subscriptions = await UserSubscription.find({ userId: { $in: userIds } }).lean();
    const subMap = {};
    for (const sub of subscriptions) {
      subMap[sub.userId.toString()] = sub;
    }

    const enriched = users.map((u) => ({
      ...u,
      subscription: subMap[u._id.toString()] || null,
    }));

    res.json({ success: true, users: enriched, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/dashboard/users/:id
 * Full details of a single user/seller.
 */
export async function getUserDetail(req, res, next) {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -verificationPin -twoFactorSecret')
      .lean();
    if (!user) throw ApiError.notFound('User not found');

    const [subscription, customers, orders, payments, products, withdrawals] = await Promise.all([
      UserSubscription.findOne({ userId: user._id }).lean(),
      Customer.find({ userId: user._id }).sort({ createdAt: -1 }).limit(50).lean(),
      Order.find({ userId: user._id }).sort({ createdAt: -1 }).limit(50).lean(),
      Payment.find({ userId: user._id }).sort({ createdAt: -1 }).limit(50).lean(),
      Product.find({ userId: user._id }).sort({ createdAt: -1 }).lean(),
      WithdrawalRequest.find({ userId: user._id }).sort({ createdAt: -1 }).limit(20).lean(),
    ]);

    const totalRevenue = payments
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    res.json({
      success: true,
      user,
      subscription,
      customers,
      orders,
      payments,
      products,
      withdrawals,
      summary: {
        totalRevenue,
        totalOrders: orders.length,
        totalCustomers: customers.length,
        totalProducts: products.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/dashboard/customers
 * List ALL customers across all sellers.
 */
export async function getAllCustomers(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const search = req.query.search || '';

    const filter = {};
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
        { whatsappNumber: { $regex: escaped, $options: 'i' } },
      ];
    }

    const [customers, total] = await Promise.all([
      Customer.find(filter)
        .populate('userId', 'name email businessName')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Customer.countDocuments(filter),
    ]);

    res.json({ success: true, customers, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/dashboard/customers/:id
 * Full customer detail with their orders and payments.
 */
export async function getCustomerDetail(req, res, next) {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate('userId', 'name email businessName')
      .lean();
    if (!customer) throw ApiError.notFound('Customer not found');

    const [orders, payments] = await Promise.all([
      Order.find({ customerId: customer._id }).sort({ createdAt: -1 }).lean(),
      Payment.find({ customerId: customer._id }).sort({ createdAt: -1 }).lean(),
    ]);

    res.json({ success: true, customer, orders, payments });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/dashboard/orders
 * All orders across the platform.
 */
export async function getAllOrders(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const status = req.query.status || '';

    const filter = {};
    if (status) filter.status = status;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('userId', 'name email businessName')
        .populate('customerId', 'name whatsappNumber')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    res.json({ success: true, orders, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/dashboard/payments
 * All payments across the platform.
 */
export async function getAllPayments(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const status = req.query.status || '';

    const filter = {};
    if (status) filter.status = status;

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate('userId', 'name email businessName')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Payment.countDocuments(filter),
    ]);

    res.json({ success: true, payments, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/dashboard/users/:id/status
 * Suspend or reactivate a user.
 */
export async function updateUserStatus(req, res, next) {
  try {
    const { status, reason } = req.body;
    if (!['active', 'suspended', 'inactive'].includes(status)) {
      throw ApiError.badRequest('Invalid status value');
    }

    const update = { status };
    if (status === 'suspended') {
      if (!reason || !reason.trim()) {
        throw ApiError.badRequest('A reason is required when suspending a user');
      }
      update.suspensionReason = reason.trim();
    } else {
      // Clear suspension reason when activating
      update.suspensionReason = null;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    ).select('-password -verificationPin -twoFactorSecret');

    if (!user) throw ApiError.notFound('User not found');

    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/dashboard/users/:id
 * Permanently delete a user/seller account and ALL associated data.
 * Only super_admin can perform this action.
 */
export async function deleteUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw ApiError.notFound('User not found');

    const userId = user._id;

    // Delete all associated data in parallel
    await Promise.all([
      Customer.deleteMany({ userId }),
      Order.deleteMany({ userId }),
      Payment.deleteMany({ userId }),
      Product.deleteMany({ userId }),
      UserSubscription.deleteMany({ userId }),
      WithdrawalRequest.deleteMany({ userId }),
      Campaign.deleteMany({ userId }),
      Coupon.deleteMany({ userId }),
      Receipt.deleteMany({ userId }),
      LedgerEntry.deleteMany({ userId }),
      AuditLog.deleteMany({ userId }),
      Analytics.deleteMany({ userId }),
      TransactionLog.deleteMany({ userId }),
      SellerPayment.deleteMany({ userId }),
      UbuntuPayAccount.deleteMany({ userId }),
    ]);

    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: `Account for ${user.email} and all associated data has been permanently deleted`,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/dashboard/recent-activity
 * Combined recent orders + payments for activity feed.
 */
export async function getRecentActivity(req, res, next) {
  try {
    const [recentOrders, recentPayments] = await Promise.all([
      Order.find()
        .populate('userId', 'businessName')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Payment.find()
        .populate('userId', 'businessName')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    const activity = [
      ...recentOrders.map((o) => ({
        type: 'order',
        description: `New order R${o.amount?.toFixed(2)} — ${o.productSnapshot?.name || 'Product'}`,
        seller: o.userId?.businessName || 'Unknown',
        status: o.status,
        date: o.createdAt,
      })),
      ...recentPayments.map((p) => ({
        type: 'payment',
        description: `Payment R${p.amount?.toFixed(2)} — ${p.paymentMethod}`,
        seller: p.userId?.businessName || 'Unknown',
        status: p.status,
        date: p.createdAt,
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 15);

    res.json({ success: true, activity });
  } catch (error) {
    next(error);
  }
}
