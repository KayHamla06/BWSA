import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
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
    return serverError(error, 'Get business error');
  }
}

export async function PUT(request) {
  try {
    await connectDB();

    const { decoded, errorResponse } = extractAuth(request, verifyToken);
    if (errorResponse) return errorResponse;

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
      return notFoundError('User not found');
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
    return serverError(error, 'Update business error');
  }
}