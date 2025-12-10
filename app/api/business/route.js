import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
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

    return NextResponse.json({
      success: true,
      business: {
        name: user.businessName,
        description: user.businessDescription,
        logo: user.logo,
        whatsappNumber: user.whatsappNumber,
        supportEmail: user.supportEmail,
        payoutInfo: user.payoutInfo,
      },
    });
  } catch (error) {
    console.error('Get business error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
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

    const { businessName, businessDescription, whatsappNumber, supportEmail, payoutInfo } = await request.json();

    const user = await User.findByIdAndUpdate(
      decoded.userId,
      {
        businessName,
        businessDescription,
        whatsappNumber,
        supportEmail,
        payoutInfo,
      },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Business info updated',
      business: {
        name: user.businessName,
        description: user.businessDescription,
        whatsappNumber: user.whatsappNumber,
        supportEmail: user.supportEmail,
        payoutInfo: user.payoutInfo,
      },
    });
  } catch (error) {
    console.error('Update business error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}