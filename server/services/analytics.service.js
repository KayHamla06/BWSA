import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import Customer from '../models/Customer.js';
import Product from '../models/Product.js';

export async function getDashboardStats(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalRevenue, ordersToday, totalCustomers, totalOrders, recentOrders, topProducts] =
    await Promise.all([
      Payment.aggregate([
        { $match: { userId, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Order.countDocuments({ userId, createdAt: { $gte: today } }),
      Customer.countDocuments({ userId }),
      Order.countDocuments({ userId }),
      Order.find({ userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('productId', 'name image_url'),
      Product.find({ userId })
        .sort({ soldCount: -1 })
        .limit(5)
        .select('name price soldCount revenue image_url'),
    ]);

  return {
    totalRevenue: totalRevenue[0]?.total || 0,
    ordersToday,
    totalCustomers,
    totalOrders,
    recentOrders,
    topProducts,
  };
}

export const analyticsService = { getDashboardStats };
