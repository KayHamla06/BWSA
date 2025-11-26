// api/billing/charge.js
import { OZOW, generateHash } from '../../lib/ozow.js';
import axios from 'axios';

export async function chargeUser(user, amountInCents) {
  const amount = (amountInCents / 100).toFixed(2);
  const ref = `BILL_${user._id}_${Date.now()}`;

  const fields = [OZOW.siteCode, 'ZAR', 'ZAR', amount, ref, `SaaS ${user.plan}`, false, user._id.toString()];
  const hash = generateHash(fields);

  const payload = {
    SiteCode: OZOW.siteCode,
    CountryCode: 'ZAR',
    CurrencyCode: 'ZAR',
    Amount: amount,
    TransactionReference: ref,
    BankReference: 'Monthly Subscription',
    Optional1: user._id.toString(),
    Customer: user.shapId,
    IsTest: false,
    HashCheck: hash
  };

  await axios.post('https://api.ozow.com/postpaymentrequest', payload);
}