import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import ApiKey from '@/models/ApiKey';
import { NextResponse } from 'next/server';
import { extractAuth, serverError } from '@/lib/apiError';

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