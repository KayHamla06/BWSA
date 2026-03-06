import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import ApiKey from '@/models/ApiKey';
import { NextResponse } from 'next/server';
import { extractAuth, notFoundError, serverError } from '@/lib/apiError';

export async function GET(request, { params }) {
  try {
    await connectDB();

    const { decoded, errorResponse } = extractAuth(request, verifyToken);
    if (errorResponse) return errorResponse;

    const apiKey = await ApiKey.findOne({
      _id: params.id,
      userId: decoded.userId,
    });

    if (!apiKey) {
      return notFoundError('API key not found');
    }

    return NextResponse.json({
      success: true,
      apiKey: {
        id: apiKey._id,
        key: apiKey.key,
        name: apiKey.name,
        usageCount: apiKey.usageCount,
        monthlyLimit: apiKey.monthlyLimit,
        lastUsed: apiKey.lastUsed,
        createdAt: apiKey.createdAt,
      },
    });
  } catch (error) {
    return serverError(error, 'Get API key error');
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB();

    const { decoded, errorResponse } = extractAuth(request, verifyToken);
    if (errorResponse) return errorResponse;

    const apiKey = await ApiKey.findOneAndDelete({
      _id: params.id,
      userId: decoded.userId,
    });

    if (!apiKey) {
      return notFoundError('API key not found');
    }

    return NextResponse.json({
      success: true,
      message: 'API key deleted',
    });
  } catch (error) {
    return serverError(error, 'Delete API key error');
  }
}