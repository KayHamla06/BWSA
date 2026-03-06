import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import Payment from '@/models/Payment';
import { NextResponse } from 'next/server';
import { extractAuth, notFoundError, serverError } from '@/lib/apiError';

export async function GET(request, { params }) {
  try {
    await connectDB();

    const { decoded, errorResponse } = extractAuth(request, verifyToken);
    if (errorResponse) return errorResponse;

    const payment = await Payment.findOne({
      _id: params.id,
      userId: decoded.userId,
    }).populate('customerId');

    if (!payment) {
      return notFoundError('Payment not found');
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
    return serverError(error, 'Get payment error');
  }
}