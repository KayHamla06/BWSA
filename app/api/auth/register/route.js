import { connectDB } from '@/lib/db';
import { generateToken } from '@/lib/jwt';
import { validateEmail, validatePassword, validateBusinessName } from '@/lib/validators';
import User from '@/models/User';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    await connectDB();

    const { name, email, password, businessName, whatsappNumber } = await request.json();

    // Validation
    if (!validateEmail(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    if (!validatePassword(password)) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    if (!validateBusinessName(businessName)) {
      return NextResponse.json({ error: 'Invalid business name' }, { status: 400 });
    }

    if (!name || !whatsappNumber) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      businessName,
      whatsappNumber,
    });

    // Generate token
    const token = generateToken({ userId: user._id, email: user.email });

    return NextResponse.json(
      {
        success: true,
        message: 'User registered successfully',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          businessName: user.businessName,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}