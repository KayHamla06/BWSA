import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import Customer from '@/models/Customer';
import { NextResponse } from 'next/server';
import { extractAuth, serverError } from '@/lib/apiError';

export async function GET(request) {
  try {
    await connectDB();

    const { decoded, errorResponse } = extractAuth(request, verifyToken);
    if (errorResponse) return errorResponse;

    const customers = await Customer.find({ userId: decoded.userId }).sort({
      lastPaymentDate: -1,
    });

    return NextResponse.json({
      success: true,
      customers: customers.map((c) => ({
        id: c._id,
        name: c.name,
        email: c.email,
        whatsappNumber: c.whatsappNumber,
        totalSpent: c.totalSpent,
        paymentCount: c.paymentCount,
        lastPaymentDate: c.lastPaymentDate,
      })),
    });
  } catch (error) {
    return serverError(error, 'Get customers error');
  }
}