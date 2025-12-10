import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import Customer from '@/models/Customer';
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
    console.error('Get customers error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}