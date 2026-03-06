import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import ApiKey from '@/models/ApiKey';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { extractAuth, serverError } from '@/lib/apiError';

export async function POST(request) {
  try {
    await connectDB();

    const { decoded, errorResponse } = extractAuth(request, verifyToken);
    if (errorResponse) return errorResponse;

    const { name } = await request.json();

    const apiKey = await ApiKey.create({
      userId: decoded.userId,
      key: crypto.randomUUID(),
      name: name || 'New API Key',
    });

    return NextResponse.json({
      success: true,
      message: 'API key generated',
      apiKey: {
        id: apiKey._id,
        key: apiKey.key,
        name: apiKey.name,
        createdAt: apiKey.createdAt,
      },
    });
  } catch (error) {
    return serverError(error, 'Generate API key error');
  }
}