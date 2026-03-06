import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import Payment from '@/models/Payment';
import ApiKey from '@/models/ApiKey';
import User from '@/models/User';
import { NextResponse } from 'next/server';
import { extractAuth, notFoundError, serverError } from '@/lib/apiError';

export async function GET(request) {
  try {
    await connectDB();

    const { decoded, errorResponse } = extractAuth(request, verifyToken);
    if (errorResponse) return errorResponse;

    const user = await User.findById(decoded.userId);

    if (!user) {
      return notFoundError('User not found');
    }

    // Get monthly stats
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const totalPayments = await Payment.countDocuments({
      userId: decoded.userId,
    });

    const monthlyPayments = await Payment.countDocuments({
      userId: decoded.userId,
      createdAt: { $gte: startOfMonth },
    });

    const completedPayments = await Payment.countDocuments({
      userId: decoded.userId,
      status: 'completed',
    });

    const failedPayments = await Payment.countDocuments({
      userId: decoded.userId,
      status: 'failed',
    });

    const monthlyRevenue = await Payment.aggregate([
      {
        $match: {
          userId: decoded.userId,
          status: 'completed',
          createdAt: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    const apiKeys = await ApiKey.find({ userId: decoded.userId });

    const totalApiCalls = apiKeys.reduce((sum, key) => sum + key.usageCount, 0);

    return NextResponse.json({
      success: true,
      usage: {
        totalPayments,
        monthlyPayments,
        completedPayments,
        failedPayments,
        monthlyRevenue: monthlyRevenue[0]?.total || 0,
        totalApiCalls,
        plan: user.plan,
      },
    });
  } catch (error) {
    return serverError(error, 'Get usage error');
  }
}