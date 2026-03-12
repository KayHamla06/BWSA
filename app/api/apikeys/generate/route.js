import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import ApiKey from '@/models/ApiKey';
import { NextResponse } from 'next/server';
import { extractAuth, serverError } from '@/lib/apiError';

export async function GET(request) {
  try {
    await connectDB();

    const { decoded, errorResponse } = extractAuth(request, verifyToken);
    if (errorResponse) return errorResponse;

    const apiKeys = await ApiKey.find({ userId: decoded.userId })
      .select('keyPrefix name usageCount monthlyLimit lastUsed createdAt')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      apiKeys,
    });
  } catch (error) {
    return serverError(error, 'List API keys error');
  }
}

export async function POST(request) {
  try {
    await connectDB();

    const { decoded, errorResponse } = extractAuth(request, verifyToken);
    if (errorResponse) return errorResponse;

    const { name } = await request.json();

    const { apiKey, rawKey } = await ApiKey.generateKey(
      decoded.userId,
      name || 'New API Key'
    );

    return NextResponse.json({
      success: true,
      message: 'API key generated',
      apiKey: {
        id: apiKey._id,
        key: rawKey,
        keyPrefix: apiKey.keyPrefix,
        name: apiKey.name,
        createdAt: apiKey.createdAt,
      },
    });
  } catch (error) {
    return serverError(error, 'Generate API key error');
  }
}