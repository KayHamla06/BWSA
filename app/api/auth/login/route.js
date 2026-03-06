import { connectDB } from '@/lib/db';
import { generateToken } from '@/lib/jwt';
import { validateEmail } from '@/lib/validators';
import User from '@/models/User';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    await connectDB();

    const { email, password } = await request.json();

    // Validation
    if (!email || !validateEmail(email)) {
      return NextResponse.json(
        { success: false, errorType: 'USER_ERROR', message: 'Please enter a valid email address', where: 'client_input' },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { success: false, errorType: 'USER_ERROR', message: 'Please enter your password', where: 'client_input' },
        { status: 400 }
      );
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return NextResponse.json(
        { success: false, errorType: 'AUTH_ERROR', message: 'Invalid email or password', where: 'client_input' },
        { status: 401 }
      );
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, errorType: 'AUTH_ERROR', message: 'Invalid email or password', where: 'client_input' },
        { status: 401 }
      );
    }

    // Generate token
    const token = generateToken({ userId: user._id, email: user.email });

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        businessName: user.businessName,
        plan: user.plan,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, errorType: 'SERVER_ERROR', message: 'Something went wrong. Please try again later.', where: 'server' },
      { status: 500 }
    );
  }
}