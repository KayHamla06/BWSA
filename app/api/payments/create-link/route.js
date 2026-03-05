import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import Payment from '@/models/Payment';
import Customer from '@/models/Customer';
import User from '@/models/User';
import { validateAmount } from '@/lib/validators';
import { whatsappService } from '@/services/whatsapp';
import { ozowService } from '@/services/ozow';
import { NextResponse } from 'next/server';

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

    const {
      customerName,
      customerEmail,
      customerPhone,
      amount,
      reason,
      paymentMethod = 'ozow',
      sendViaWhatsApp = true,
    } = await request.json();

    // Validation
    if (!customerName || !customerPhone || !validateAmount(amount)) {
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      );
    }

    const user = await User.findById(decoded.userId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find or create customer
    let customer = await Customer.findOne({
      userId: decoded.userId,
      whatsappNumber: customerPhone,
    });

    if (!customer) {
      customer = await Customer.create({
        userId: decoded.userId,
        name: customerName,
        email: customerEmail || '',
        whatsappNumber: customerPhone,
      });
    }

    // Create payment request with Ozow
    const paymentRequestResult = await ozowService.createPaymentRequest(
      amount,
      `PAY-${Date.now()}`,
      `${process.env.APP_URL}/payment-success`,
      `${process.env.APP_URL}/payment-failed`,
      `${process.env.APP_URL}/payment-canceled`,
      {
        customerName,
        customerEmail,
        phoneNumber: customerPhone,
      }
    );

    if (!paymentRequestResult.success) {
      return NextResponse.json(
        { 
          error: paymentRequestResult.error || 'Failed to create payment request',
          unavailableServices: !ozowService.isConfigured() ? ['ozow'] : [],
          message: 'Payment service not available. Please ensure API keys are configured.',
        },
        { status: 400 }
      );
    }

    // Create payment record
    const payment = await Payment.create({
      userId: decoded.userId,
      customerId: customer._id,
      amount,
      paymentMethod,
      status: 'pending',
      paymentLinkId: paymentRequestResult.data.redirectUrl || `PAY-${Date.now()}`,
      reason: reason || '',
      metadata: {
        customerEmail,
        initiatedBy: user.businessName,
      },
    });

    // Send payment link via WhatsApp if enabled
    let whatsappResult = { success: true };
    if (sendViaWhatsApp) {
      whatsappResult = await whatsappService.sendPaymentLink(
        customerPhone,
        paymentRequestResult.data.redirectUrl || payment.paymentLinkId,
        customerName
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Payment link created',
      payment: {
        id: payment._id,
        amount: payment.amount,
        paymentLink: paymentRequestResult.data.redirectUrl || payment.paymentLinkId,
        customerName,
        status: payment.status,
        createdAt: payment.createdAt,
      },
      serviceStatus: {
        ozow: {
          available: ozowService.isConfigured(),
          status: 'Payment processing ready'
        },
        whatsapp: {
          available: whatsappService.isConfigured(),
          messageSent: whatsappResult.success || false,
          status: !whatsappService.isConfigured() ? 'Not configured - message not sent' : 'Message sent'
        }
      }
    });
  } catch (error) {
    console.error('Create payment link error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}