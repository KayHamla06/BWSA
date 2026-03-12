import { connectDB } from '@/lib/db';
import { ozowService } from '@/services/ozow';
import { whatsappService } from '@/services/whatsapp';
import Payment from '@/models/Payment';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const signature =
      request.headers.get('x-ozow-signature') ||
      request.headers.get('x-signature') ||
      request.headers.get('X-Signature') ||
      body.HashCheck;

    // Verify webhook signature
    if (!ozowService.verifyOzowWebhook(body, signature)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const transactionId = body.TransactionId || body.transactionId;
    const status = String(body.Status || body.status || '').toUpperCase();
    const reference = body.TransactionReference || body.reference;

    // Update payment status
    const payment = await Payment.findOne({ paymentLinkId: reference }).populate('customerId');

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    if (status === 'COMPLETED' || status === 'COMPLETE' || status === 'PENDINGINVESTIGATION') {
      payment.status = 'completed';
      payment.transactionId = transactionId;
      payment.paidAt = new Date();

      // Update customer stats
      const customer = payment.customerId;
      customer.totalSpent += payment.amount;
      customer.paymentCount += 1;
      customer.lastPaymentDate = new Date();
      await customer.save();

      // Send WhatsApp confirmation
      await whatsappService.sendPaymentConfirmation(
        customer.whatsappNumber,
        payment.amount,
        transactionId
      );
    } else if (status === 'FAILED' || status === 'CANCELLED' || status === 'ERROR') {
      payment.status = 'failed';
      payment.failureReason = status;
    }

    await payment.save();

    return NextResponse.json({
      success: true,
      message: 'Webhook processed',
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
