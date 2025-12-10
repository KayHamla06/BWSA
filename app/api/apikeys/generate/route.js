import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import ApiKey from '@/models/ApiKey';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request) {
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
    console.error('Generate API key error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}