import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import Customer from '../models/Customer.js';
import Product from '../models/Product.js';
import Receipt from '../models/Receipt.js';
import TransactionLog from '../models/TransactionLog.js';
import UbuntuPayAccount from '../models/UbuntuPayAccount.js';
import WithdrawalRequest from '../models/WithdrawalRequest.js';
import SellerPayment from '../models/SellerPayment.js';
import { paymentService } from './payment.service.js';

function createLastSevenDayBuckets() {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let index = 6; index >= 0; index -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - index);
    days.push(day);
  }

  return days;
}

async function aggregateDailySeries(model, match, valueField = null) {
  const days = createLastSevenDayBuckets();
  const startDate = days[0];
  const results = await model.aggregate([
    { $match: { ...match, createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
        },
        value: valueField ? { $sum: `$${valueField}` } : { $sum: 1 },
      },
    },
  ]);

  return days.map((day) => {
    const found = results.find(
      (result) => result._id.year === day.getFullYear()
        && result._id.month === day.getMonth() + 1
        && result._id.day === day.getDate()
    );

    return {
      label: day.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' }),
      value: found?.value || 0,
    };
  });
}

export async function getDashboardStats(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(today);
  monthStart.setDate(monthStart.getDate() - 30);

  const [totalRevenue, ordersToday, totalCustomers, totalOrders, recentOrders, topProducts, receiptsToday, receiptsWeek, receiptsMonth, approvedPayments, declinedPayments, pendingOrders, dailyRevenue, ordersPerDay, customerGrowth, ubuntuPayAccount, pendingWithdrawals, sellerPayment, pendingWithdrawalAmount, wallet] =
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
      Receipt.countDocuments({ sellerId: userId, createdAt: { $gte: today } }),
      Receipt.countDocuments({ sellerId: userId, createdAt: { $gte: weekStart } }),
      Receipt.countDocuments({ sellerId: userId, createdAt: { $gte: monthStart } }),
      TransactionLog.countDocuments({ sellerId: userId, status: 'APPROVED', createdAt: { $gte: monthStart } }),
      TransactionLog.countDocuments({ sellerId: userId, status: 'DECLINED', createdAt: { $gte: monthStart } }),
      Order.countDocuments({ userId, status: 'pending' }),
      aggregateDailySeries(Payment, { userId, status: 'completed' }, 'amount'),
      aggregateDailySeries(Order, { userId }),
      aggregateDailySeries(Customer, { userId }),
      UbuntuPayAccount.findOne({ userId }),
      WithdrawalRequest.countDocuments({ userId, status: { $in: ['pending', 'processing'] } }),
      SellerPayment.findOne({ userId }).select('paymentFlow'),
      WithdrawalRequest.aggregate([
        { $match: { userId, status: { $in: ['pending', 'processing'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      paymentService.getWalletBalance(userId),
    ]);

  return {
    totalRevenue: totalRevenue[0]?.total || 0,
    ordersToday,
    totalCustomers,
    totalOrders,
    receiptsToday,
    receiptsWeek,
    receiptsMonth,
    approvedPayments,
    declinedPayments,
    pendingOrders,
    ubuntuPayBalance: wallet.balance,
    ubuntuPayPendingBalance: pendingWithdrawalAmount[0]?.total || 0,
    pendingWithdrawals,
    walletStatus: ubuntuPayAccount?.walletStatus || 'active',
    paymentFlow: sellerPayment?.paymentFlow || 'ubuntu_pay',
    dailyRevenue,
    ordersPerDay,
    customerGrowth,
    recentOrders,
    topProducts,
  };
}

export const analyticsService = { getDashboardStats };
