import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import ApiKey from '@/models/ApiKey';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
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

    const apiKey = await ApiKey.findOne({
      _id: params.id,
      userId: decoded.userId,
    });

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
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
    console.error('Get API key error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
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

    const apiKey = await ApiKey.findOneAndDelete({
      _id: params.id,
      userId: decoded.userId,
    });

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'API key deleted',
    });
  } catch (error) {
    console.error('Delete API key error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}