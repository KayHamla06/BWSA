import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import Payment from '@/models/Payment';
import ApiKey from '@/models/ApiKey';
import User from '@/models/User';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    await connectDB();

    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const user = await User.findById(decoded.userId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
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
    console.error('Get usage error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}