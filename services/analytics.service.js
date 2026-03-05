// services/analytics.service.js
import Analytics from '../models/Analytics.js';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import Customer from '../models/Customer.js';
import Product from '../models/Product.js';
import logger from '../utils/logger.js';

class AnalyticsService {
  // Generate analytics for a period
  async generateAnalytics(userId, period = 'daily', date = new Date()) {
    try {
      const { startDate, endDate } = this.getPeriodDates(period, date);

      // Aggregate data
      const [orderStats, paymentStats, customerStats, productStats] = await Promise.all([
        this.getOrderStats(userId, startDate, endDate),
        this.getPaymentStats(userId, startDate, endDate),
        this.getCustomerStats(userId, startDate, endDate),
        this.getTopProducts(userId, startDate, endDate),
      ]);

      // Calculate metrics
      const metrics = {
        revenue: orderStats.totalRevenue || 0,
        orders: orderStats.totalOrders || 0,
        customers: customerStats.totalCustomers || 0,
        newCustomers: customerStats.newCustomers || 0,
        payments: paymentStats.totalPayments || 0,
        successfulPayments: paymentStats.successfulPayments || 0,
        failedPayments: paymentStats.failedPayments || 0,
        averageOrderValue: orderStats.averageOrderValue || 0,
        whatsappMessages: 0, // Would be tracked separately
        apiCalls: 0, // Would be tracked separately
      };

      // Save or update analytics
      const analytics = await Analytics.findOneAndUpdate(
        { userId, period, date: startDate },
        {
          metrics,
          topProducts: productStats,
        },
        { upsert: true, new: true }
      );

      logger.info('Analytics generated', { userId, period, date: startDate });

      return analytics;
    } catch (error) {
      logger.error('Error generating analytics:', error);
      throw error;
    }
  }

  // Get dashboard overview
  async getDashboardOverview(userId, timeframe = '30d') {
    try {
      const { startDate, endDate } = this.getTimeframeDates(timeframe);

      const [
        revenue,
        orders,
        customers,
        payments,
        revenueByDay,
        topProducts,
        recentOrders,
      ] = await Promise.all([
        this.getTotalRevenue(userId, startDate, endDate),
        this.getTotalOrders(userId, startDate, endDate),
        this.getTotalCustomers(userId, startDate, endDate),
        this.getPaymentStats(userId, startDate, endDate),
        this.getRevenueByDay(userId, startDate, endDate),
        this.getTopProducts(userId, startDate, endDate, 5),
        this.getRecentOrders(userId, 5),
      ]);

      return {
        summary: {
          revenue: revenue.total || 0,
          revenueChange: revenue.change || 0,
          orders: orders.total || 0,
          ordersChange: orders.change || 0,
          customers: customers.total || 0,
          customersChange: customers.change || 0,
          successRate: payments.successRate || 0,
        },
        charts: {
          revenueByDay,
          topProducts,
        },
        recentActivity: {
          orders: recentOrders,
        },
      };
    } catch (error) {
      logger.error('Error fetching dashboard overview:', error);
      throw error;
    }
  }

  // Get revenue statistics
  async getTotalRevenue(userId, startDate, endDate) {
    try {
      const currentPeriod = await Order.aggregate([
        {
          $match: {
            userId,
            status: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] },
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$total' },
          },
        },
      ]);

      // Calculate previous period for comparison
      const periodDiff = endDate - startDate;
      const prevStartDate = new Date(startDate - periodDiff);
      const prevEndDate = startDate;

      const previousPeriod = await Order.aggregate([
        {
          $match: {
            userId,
            status: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] },
            createdAt: { $gte: prevStartDate, $lt: prevEndDate },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$total' },
          },
        },
      ]);

      const currentTotal = currentPeriod[0]?.total || 0;
      const previousTotal = previousPeriod[0]?.total || 0;

      const change = previousTotal > 0
        ? ((currentTotal - previousTotal) / previousTotal) * 100
        : currentTotal > 0 ? 100 : 0;

      return { total: currentTotal, change: Math.round(change * 10) / 10 };
    } catch (error) {
      logger.error('Error fetching revenue stats:', error);
      throw error;
    }
  }

  // Get order statistics
  async getOrderStats(userId, startDate, endDate) {
    try {
      const stats = await Order.aggregate([
        {
          $match: {
            userId,
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$total' },
            averageOrderValue: { $avg: '$total' },
          },
        },
      ]);

      return stats[0] || { totalOrders: 0, totalRevenue: 0, averageOrderValue: 0 };
    } catch (error) {
      logger.error('Error fetching order stats:', error);
      throw error;
    }
  }

  // Get total orders with comparison
  async getTotalOrders(userId, startDate, endDate) {
    try {
      const currentCount = await Order.countDocuments({
        userId,
        createdAt: { $gte: startDate, $lte: endDate },
      });

      const periodDiff = endDate - startDate;
      const prevStartDate = new Date(startDate - periodDiff);
      const prevEndDate = startDate;

      const previousCount = await Order.countDocuments({
        userId,
        createdAt: { $gte: prevStartDate, $lt: prevEndDate },
      });

      const change = previousCount > 0
        ? ((currentCount - previousCount) / previousCount) * 100
        : currentCount > 0 ? 100 : 0;

      return { total: currentCount, change: Math.round(change * 10) / 10 };
    } catch (error) {
      logger.error('Error fetching total orders:', error);
      throw error;
    }
  }

  // Get payment statistics
  async getPaymentStats(userId, startDate, endDate) {
    try {
      const stats = await Payment.aggregate([
        {
          $match: {
            userId,
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: null,
            totalPayments: { $sum: 1 },
            successfulPayments: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
            },
            failedPayments: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
            },
          },
        },
      ]);

      const result = stats[0] || { totalPayments: 0, successfulPayments: 0, failedPayments: 0 };
      result.successRate = result.totalPayments > 0
        ? Math.round((result.successfulPayments / result.totalPayments) * 100)
        : 0;

      return result;
    } catch (error) {
      logger.error('Error fetching payment stats:', error);
      throw error;
    }
  }

  // Get customer statistics
  async getCustomerStats(userId, startDate, endDate) {
    try {
      const totalCustomers = await Customer.countDocuments({ userId });
      const newCustomers = await Customer.countDocuments({
        userId,
        createdAt: { $gte: startDate, $lte: endDate },
      });

      return { totalCustomers, newCustomers };
    } catch (error) {
      logger.error('Error fetching customer stats:', error);
      throw error;
    }
  }

  // Get total customers with comparison
  async getTotalCustomers(userId, startDate, endDate) {
    try {
      const currentCount = await Customer.countDocuments({
        userId,
        createdAt: { $lte: endDate },
      });

      const previousCount = await Customer.countDocuments({
        userId,
        createdAt: { $lt: startDate },
      });

      const change = previousCount > 0
        ? ((currentCount - previousCount) / previousCount) * 100
        : currentCount > 0 ? 100 : 0;

      return { total: currentCount, change: Math.round(change * 10) / 10 };
    } catch (error) {
      logger.error('Error fetching total customers:', error);
      throw error;
    }
  }

  // Get top selling products
  async getTopProducts(userId, startDate, endDate, limit = 10) {
    try {
      const topProducts = await Order.aggregate([
        {
          $match: {
            userId,
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] },
          },
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productId',
            name: { $first: '$items.name' },
            sales: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.subtotal' },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: limit },
        {
          $project: {
            productId: '$_id',
            name: 1,
            sales: 1,
            revenue: 1,
            _id: 0,
          },
        },
      ]);

      return topProducts;
    } catch (error) {
      logger.error('Error fetching top products:', error);
      throw error;
    }
  }

  // Get revenue by day
  async getRevenueByDay(userId, startDate, endDate) {
    try {
      const revenueByDay = await Order.aggregate([
        {
          $match: {
            userId,
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            revenue: { $sum: '$total' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            date: '$_id',
            revenue: 1,
            orders: 1,
            _id: 0,
          },
        },
      ]);

      return revenueByDay;
    } catch (error) {
      logger.error('Error fetching revenue by day:', error);
      throw error;
    }
  }

  // Get recent orders
  async getRecentOrders(userId, limit = 10) {
    try {
      const orders = await Order.find({ userId })
        .populate('customerId', 'name whatsappNumber')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return orders;
    } catch (error) {
      logger.error('Error fetching recent orders:', error);
      throw error;
    }
  }

  // Helper: Get period date range
  getPeriodDates(period, date) {
    const d = new Date(date);
    let startDate, endDate;

    switch (period) {
      case 'daily':
        startDate = new Date(d.setHours(0, 0, 0, 0));
        endDate = new Date(d.setHours(23, 59, 59, 999));
        break;
      case 'weekly':
        const dayOfWeek = d.getDay();
        startDate = new Date(d.setDate(d.getDate() - dayOfWeek));
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(d.setDate(d.getDate() + 6));
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'monthly':
        startDate = new Date(d.getFullYear(), d.getMonth(), 1);
        endDate = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'yearly':
        startDate = new Date(d.getFullYear(), 0, 1);
        endDate = new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      default:
        throw new Error('Invalid period');
    }

    return { startDate, endDate };
  }

  // Helper: Get timeframe date range
  getTimeframeDates(timeframe) {
    const endDate = new Date();
    let startDate;

    switch (timeframe) {
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate };
  }
}

export default new AnalyticsService();
