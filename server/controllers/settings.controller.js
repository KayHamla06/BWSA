import User from '../models/User.js';
import SellerPayment from '../models/SellerPayment.js';

export async function getSettings(req, res, next) {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    const sellerPayment = await SellerPayment.findOne({ userId: req.user.userId });

    res.json({
      success: true,
      profile: user,
      paymentSettings: sellerPayment || { isConfigured: false },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const { businessName, businessDescription, whatsappNumber, supportEmail } = req.body;
    const update = {};

    if (businessName) update.businessName = businessName;
    if (businessDescription !== undefined) update.businessDescription = businessDescription;
    if (whatsappNumber) update.whatsappNumber = whatsappNumber;
    if (supportEmail !== undefined) update.supportEmail = supportEmail;

    const user = await User.findByIdAndUpdate(req.user.userId, update, { new: true }).select('-password');
    res.json({ success: true, message: 'Profile updated', user });
  } catch (error) {
    next(error);
  }
}

export async function updatePaymentSettings(req, res, next) {
  try {
    const { ozowMerchantId, ozowApiKey, ozowPrivateKey, ozowSiteCode, bankName, accountHolder, accountNumber, accountType } = req.body;

    const data = {
      userId: req.user.userId,
      ozowMerchantId: ozowMerchantId || '',
      ozowApiKey: ozowApiKey || '',
      ozowPrivateKey: ozowPrivateKey || '',
      ozowSiteCode: ozowSiteCode || '',
      bankName: bankName || '',
      accountHolder: accountHolder || '',
      accountNumber: accountNumber || '',
      accountType: accountType || '',
    };

    const sellerPayment = await SellerPayment.findOneAndUpdate(
      { userId: req.user.userId },
      data,
      { new: true, upsert: true }
    );

    res.json({ success: true, message: 'Payment settings updated', paymentSettings: sellerPayment });
  } catch (error) {
    next(error);
  }
}
