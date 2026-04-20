import User from '../models/User.js';
import SellerPayment from '../models/SellerPayment.js';
import { paymentService } from '../services/payment.service.js';
import { uploadImage } from '../services/cloudinary.service.js';
import { decryptSensitive, encryptSensitive, maskSensitive } from '../utils/crypto.util.js';

export async function getSettings(req, res, next) {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    const [sellerPayment, ubuntuPayAccount, wallet] = await Promise.all([
      SellerPayment.findOne({ userId: req.user.userId }),
      paymentService.ensureUbuntuPayAccount(req.user.userId),
      paymentService.getWalletBalance(req.user.userId, { ipAddress: req.ip }),
    ]);

    res.json({
      success: true,
      profile: user,
      suspension: user.status === 'suspended'
        ? { suspended: true, reason: user.suspensionReason || 'No reason provided' }
        : { suspended: false },
      paymentSettings: sellerPayment
        ? {
            isConfigured: sellerPayment.isConfigured,
            paymentFlow: sellerPayment.paymentFlow,
            payfastMerchantId: sellerPayment.payfastMerchantId,
            hasPayfastMerchantKey: Boolean(sellerPayment.payfastMerchantKey),
            hasPayfastPassphrase: Boolean(sellerPayment.payfastPassphrase),
            payfastReturnUrl: sellerPayment.payfastReturnUrl,
            payfastCancelUrl: sellerPayment.payfastCancelUrl,
            hasBankDetails: Boolean(sellerPayment.bankName && sellerPayment.accountHolder && sellerPayment.accountNumber),
            maskedAccountNumber: maskSensitive(decryptSensitive(sellerPayment.accountNumber)),
            accountType: sellerPayment.accountType,
            hasPayShap: Boolean(sellerPayment.payshapId),
            hasQrPaymentDetails: Boolean(sellerPayment.qrPaymentDetails),
            hasCapitecDetails: Boolean(sellerPayment.capitecNumber && sellerPayment.capitecSurname),
          }
        : { isConfigured: false, paymentFlow: 'ubuntu_pay' },
      ubuntuPayAccount: {
        walletStatus: ubuntuPayAccount.walletStatus,
        currency: ubuntuPayAccount.currency,
        availableBalance: wallet.balance,
        totalCredits: wallet.credits,
        totalDebits: wallet.debits,
      },
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

    if (req.file) {
      const uploadedLogo = await uploadImage(req.file.buffer, 'logos');
      update.logo = uploadedLogo.url;
    }

    const user = await User.findByIdAndUpdate(req.user.userId, update, { new: true }).select('-password');
    res.json({ success: true, message: 'Profile updated', user });
  } catch (error) {
    next(error);
  }
}

export async function updatePaymentSettings(req, res, next) {
  try {
    const {
      paymentFlow,
      payfastMerchantId,
      payfastMerchantKey,
      payfastPassphrase,
      payfastReturnUrl,
      payfastCancelUrl,
      bankName,
      accountHolder,
      accountNumber,
      accountType,
      payshapId,
      qrPaymentDetails,
      capitecNumber,
      capitecSurname,
    } = req.body;

    const sellerPayment = await SellerPayment.findOne({ userId: req.user.userId }) || new SellerPayment({ userId: req.user.userId });

    sellerPayment.paymentFlow = paymentFlow === 'payfast_direct' ? 'payfast_direct' : 'ubuntu_pay';
    sellerPayment.payfastMerchantId = payfastMerchantId || sellerPayment.payfastMerchantId || '';
    sellerPayment.payfastMerchantKey = payfastMerchantKey || sellerPayment.payfastMerchantKey || '';
    sellerPayment.payfastPassphrase = payfastPassphrase || sellerPayment.payfastPassphrase || '';
    sellerPayment.payfastReturnUrl = payfastReturnUrl || '';
    sellerPayment.payfastCancelUrl = payfastCancelUrl || '';
    sellerPayment.bankName = bankName || sellerPayment.bankName || '';
    sellerPayment.accountHolder = accountHolder ? encryptSensitive(accountHolder) : sellerPayment.accountHolder || '';
    sellerPayment.accountNumber = accountNumber ? encryptSensitive(accountNumber) : sellerPayment.accountNumber || '';
    sellerPayment.accountType = accountType || '';
    sellerPayment.payshapId = payshapId ? encryptSensitive(payshapId) : sellerPayment.payshapId || '';
    sellerPayment.qrPaymentDetails = qrPaymentDetails ? encryptSensitive(qrPaymentDetails) : sellerPayment.qrPaymentDetails || '';
    sellerPayment.capitecNumber = capitecNumber ? encryptSensitive(capitecNumber) : sellerPayment.capitecNumber || '';
    sellerPayment.capitecSurname = capitecSurname ? encryptSensitive(capitecSurname) : sellerPayment.capitecSurname || '';
    await sellerPayment.save();

    await paymentService.ensureUbuntuPayAccount(req.user.userId);

    res.json({
      success: true,
      message: 'Payment settings updated',
      paymentSettings: {
        isConfigured: sellerPayment.isConfigured,
        paymentFlow: sellerPayment.paymentFlow,
      },
    });
  } catch (error) {
    next(error);
  }
}
