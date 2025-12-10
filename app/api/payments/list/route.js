import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import Payment from '@/models/Payment';
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

    const { limit = '50', page = '1', status } = request.nextUrl.searchParams;

    const query = { userId: decoded.userId };

    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const payments = await Payment.find(query)
      .populate('customerId', 'name email whatsappNumber')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Payment.countDocuments(query);

    return NextResponse.json({
      success: true,
      payments: payments.map((p) => ({
        id: p._id,
        amount: p.amount,
        status: p.status,
        customer: p.customerId,
        reason: p.reason,
        paymentMethod: p.paymentMethod,
        createdAt: p.createdAt,
      })),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('List payments error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}