import nodemailer from 'nodemailer';

// Configure your email service here (Gmail, SendGrid, etc.)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendEmail(to, subject, html) {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html,
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email Error:', error);
    return { success: false, error: error.message };
  }
}

export async function sendVerificationEmail(email, verificationToken) {
  const verificationLink = `${process.env.APP_URL}/verify?token=${verificationToken}`;
  const html = `
    <h2>Verify your email</h2>
    <p>Click the link below to verify your email address:</p>
    <a href="${verificationLink}">Verify Email</a>
  `;
  return sendEmail(email, 'Verify your email', html);
}

export async function sendPasswordResetEmail(email, resetToken) {
  const resetLink = `${process.env.APP_URL}/reset-password?token=${resetToken}`;
  const html = `
    <h2>Reset your password</h2>
    <p>Click the link below to reset your password:</p>
    <a href="${resetLink}">Reset Password</a>
  `;
  return sendEmail(email, 'Reset your password', html);
}

export async function sendPaymentReceivedEmail(email, paymentInfo) {
  const html = `
    <h2>Payment Received</h2>
    <p>Thank you for your payment!</p>
    <ul>
      <li>Amount: R${paymentInfo.amount}</li>
      <li>Transaction ID: ${paymentInfo.transactionId}</li>
      <li>Date: ${new Date(paymentInfo.date).toLocaleDateString()}</li>
    </ul>
  `;
  return sendEmail(email, 'Payment Received', html);
}