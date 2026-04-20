// Settings page logic
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();

  document.getElementById('paymentFlow').addEventListener('change', togglePaymentFlowUI);

  document.getElementById('businessLogo').addEventListener('change', (event) => {
    const file = event.target.files[0];
    const preview = document.getElementById('businessLogoPreview');
    preview.innerHTML = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      preview.innerHTML = `<img src="${loadEvent.target.result}" alt="Business logo preview">`;
    };
    reader.readAsDataURL(file);
  });

  // Profile form
  document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
      const formData = new FormData();
      formData.append('businessName', document.getElementById('businessName').value);
      formData.append('whatsappNumber', document.getElementById('whatsappNumber').value);
      formData.append('businessDescription', document.getElementById('businessDescription').value);
      formData.append('supportEmail', document.getElementById('supportEmail').value);

      const logoFile = document.getElementById('businessLogo').files[0];
      if (logoFile) formData.append('logo', logoFile);

      const response = await api.upload('/api/settings/profile', formData, 'PUT');

      const user = JSON.parse(localStorage.getItem('user') || '{}');
      user.businessName = response.user.businessName;
      user.logo = response.user.logo || user.logo || '';
      localStorage.setItem('user', JSON.stringify(user));

      showToast('Profile updated!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Profile';
    }
  });

  // Payment settings form
  document.getElementById('paymentSettingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
      await api.put('/api/settings/payment', {
        paymentFlow: document.getElementById('paymentFlow').value,
        payfastMerchantId: document.getElementById('payfastMerchantId').value,
        payfastMerchantKey: document.getElementById('payfastMerchantKey').value,
        payfastPassphrase: document.getElementById('payfastPassphrase').value,
        payfastReturnUrl: document.getElementById('payfastReturnUrl').value,
        payfastCancelUrl: document.getElementById('payfastCancelUrl').value,
        bankName: document.getElementById('bankName').value,
        accountHolder: document.getElementById('accountHolder').value,
        accountNumber: document.getElementById('accountNumber').value,
        accountType: document.getElementById('accountType').value,
        payshapId: document.getElementById('payshapId').value,
        qrPaymentDetails: document.getElementById('qrPaymentDetails').value,
        capitecNumber: document.getElementById('capitecNumber').value,
        capitecSurname: document.getElementById('capitecSurname').value,
      });
      showToast('Payment settings saved!', 'success');
      loadSettings();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Payment Settings';
    }
  });

  document.getElementById('couponForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Creating...';

    try {
      await api.post('/api/coupons', {
        couponCode: document.getElementById('couponCode').value,
        discountPercentage: document.getElementById('discountPercentage').value,
        expirationDate: document.getElementById('expirationDate').value,
      });
      e.target.reset();
      showToast('Coupon created!', 'success');
      loadCoupons();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Create Coupon';
    }
  });

  async function loadSettings() {
    try {
      const data = await api.get('/api/settings');

      // Profile
      if (data.profile) {
        document.getElementById('businessName').value = data.profile.businessName || '';
        document.getElementById('whatsappNumber').value = data.profile.whatsappNumber || '';
        document.getElementById('businessDescription').value = data.profile.businessDescription || '';
        document.getElementById('supportEmail').value = data.profile.supportEmail || data.profile.email || '';
        if (data.profile.logo) {
          document.getElementById('businessLogoPreview').innerHTML = `<img src="${data.profile.logo}" alt="Current business logo">`;
        }
      }

      // Payment settings
      if (data.paymentSettings) {
        document.getElementById('paymentFlow').value = data.paymentSettings.paymentFlow || 'ubuntu_pay';
        document.getElementById('payfastMerchantId').value = data.paymentSettings.payfastMerchantId || '';
        document.getElementById('payfastMerchantKey').value = '';
        document.getElementById('payfastPassphrase').value = '';
        document.getElementById('payfastReturnUrl').value = data.paymentSettings.payfastReturnUrl || '';
        document.getElementById('payfastCancelUrl').value = data.paymentSettings.payfastCancelUrl || '';
        document.getElementById('bankName').value = '';
        document.getElementById('accountHolder').value = '';
        document.getElementById('accountNumber').value = '';
        document.getElementById('accountType').value = data.paymentSettings.accountType || '';
        document.getElementById('payshapId').value = '';
        document.getElementById('qrPaymentDetails').value = '';
        document.getElementById('capitecNumber').value = '';
        document.getElementById('capitecSurname').value = '';

        document.getElementById('settingsAvailableBalance').textContent = `R${Number(data.ubuntuPayAccount?.availableBalance || 0).toFixed(2)}`;
        document.getElementById('settingsPendingBalance').textContent = `R${Number(data.ubuntuPayAccount?.pendingBalance || 0).toFixed(2)}`;

        const flowHint = document.getElementById('paymentFlowHint');
        if (data.paymentSettings.paymentFlow === 'payfast_direct') {
          flowHint.textContent = 'Direct PayFast is active. Customer payments go straight to your PayFast account and bypass Ubuntu Pay.';
        } else {
          const bankConfigured = data.paymentSettings.hasBankDetails
            ? ` Saved bank account ending ${data.paymentSettings.maskedAccountNumber || ''}.`
            : ' Save payout details below to enable withdrawals.';
          flowHint.textContent = `Ubuntu Pay is active. Customer payments settle to the platform, then you withdraw from your balance.${bankConfigured}`;
        }

        togglePaymentFlowUI();

        const statusEl = document.getElementById('paymentStatus');
        if (data.paymentSettings.isConfigured) {
          statusEl.textContent = 'Payments configured';
          statusEl.className = 'success-message';
          statusEl.hidden = false;
        } else {
          statusEl.hidden = true;
        }
      }

      loadCoupons();
    } catch (err) {
      console.error('Load settings error:', err);
    }
  }

  async function loadCoupons() {
    try {
      const data = await api.get('/api/coupons');
      const coupons = data.coupons || [];
      const couponList = document.getElementById('couponList');

      if (coupons.length === 0) {
        couponList.innerHTML = '<p class="text-muted">No coupons yet.</p>';
        return;
      }

      couponList.innerHTML = coupons.map((coupon) => `
        <div class="stack-item">
          <strong>${coupon.couponCode}</strong>
          <span>${coupon.discountPercentage}% off</span>
          <span>Expires ${new Date(coupon.expirationDate).toLocaleDateString()}</span>
          <button class="btn btn-outline btn-sm" data-coupon-id="${coupon._id}">Delete</button>
        </div>
      `).join('');

      couponList.querySelectorAll('[data-coupon-id]').forEach((button) => {
        button.addEventListener('click', async () => {
          try {
            await api.delete(`/api/coupons/${button.dataset.couponId}`);
            showToast('Coupon deleted.', 'success');
            loadCoupons();
          } catch (err) {
            showToast(err.message, 'error');
          }
        });
      });
    } catch (err) {
      document.getElementById('couponList').innerHTML = '<p class="text-muted">Unable to load coupons.</p>';
    }
  }

  function togglePaymentFlowUI() {
    const isDirect = document.getElementById('paymentFlow').value === 'payfast_direct';
    document.getElementById('payfastDirectFields').hidden = !isDirect;
    document.getElementById('settingsWalletSummary').hidden = isDirect;
  }
});
