import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import Payment from '@/models/Payment';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
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

    const payment = await Payment.findOne({
      _id: params.id,
      userId: decoded.userId,
    }).populate('customerId');

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      payment: {
        id: payment._id,
        amount: payment.amount,
        status: payment.status,
        customer: payment.customerId,
        reason: payment.reason,
        paymentMethod: payment.paymentMethod,
        transactionId: payment.transactionId,
        createdAt: payment.createdAt,
        paidAt: payment.paidAt,
      },
    });
  } catch (error) {
    console.error('Get payment error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}