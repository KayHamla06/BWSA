import { connectDB } from '@/lib/db';
import { generateToken } from '@/lib/jwt';
import { validateEmail, validatePassword, validateBusinessName } from '@/lib/validators';
import User from '@/models/User';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const {
      name,
      email,
      password,
      businessName,
      whatsappNumber,
      phone,
      plan,
    } = body;

    // Resolve field aliases (landing page sends 'phone', register page sends 'whatsappNumber')
    const resolvedName = name || businessName || '';
    const resolvedPhone = whatsappNumber || phone || '';

    // Validation
    if (!email || !validateEmail(email)) {
      return NextResponse.json(
        { success: false, errorType: 'USER_ERROR', message: 'Please enter a valid email address', where: 'client_input' },
        { status: 400 }
      );
    }

    if (!password || !validatePassword(password)) {
      return NextResponse.json(
        { success: false, errorType: 'USER_ERROR', message: 'Password must be at least 8 characters', where: 'client_input' },
        { status: 400 }
      );
    }

    if (!businessName || !validateBusinessName(businessName)) {
      return NextResponse.json(
        { success: false, errorType: 'USER_ERROR', message: 'Please enter a valid business name (at least 2 characters)', where: 'client_input' },
        { status: 400 }
      );
    }

    if (!resolvedName) {
      return NextResponse.json(
        { success: false, errorType: 'USER_ERROR', message: 'Please enter your name', where: 'client_input' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { success: false, errorType: 'USER_ERROR', message: 'An account with this email already exists', where: 'client_input' },
        { status: 400 }
      );
    }

    // Create user
    const user = await User.create({
      name: resolvedName,
      email: email.toLowerCase(),
      password,
      businessName,
      whatsappNumber: resolvedPhone,
      plan: plan || 'free',
    });

    // Generate token
    const token = generateToken({ userId: user._id, email: user.email });

    return NextResponse.json(
      {
        success: true,
        message: 'Account created successfully',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          businessName: user.businessName,
          plan: user.plan,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, errorType: 'SERVER_ERROR', message: 'Something went wrong. Please try again later.', where: 'server' },
      { status: 500 }
    );
  }
}