// Settings page logic
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();

  // Profile form
  document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
      await api.put('/api/settings/profile', {
        businessName: document.getElementById('businessName').value,
        whatsappNumber: document.getElementById('whatsappNumber').value,
        businessDescription: document.getElementById('businessDescription').value,
        supportEmail: document.getElementById('supportEmail').value,
      });
      alert('Profile updated!');
    } catch (err) {
      alert(err.message);
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
        ozowMerchantId: document.getElementById('ozowMerchantId').value,
        ozowSiteCode: document.getElementById('ozowSiteCode').value,
        ozowApiKey: document.getElementById('ozowApiKey').value,
        ozowPrivateKey: document.getElementById('ozowPrivateKey').value,
        bankName: document.getElementById('bankName').value,
        accountHolder: document.getElementById('accountHolder').value,
        accountNumber: document.getElementById('accountNumber').value,
        accountType: document.getElementById('accountType').value,
      });
      alert('Payment settings saved!');
    } catch (err) {
      alert(err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Payment Settings';
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
      }

      // Payment settings
      if (data.payment) {
        document.getElementById('ozowMerchantId').value = data.payment.ozowMerchantId || '';
        document.getElementById('ozowSiteCode').value = data.payment.ozowSiteCode || '';
        document.getElementById('ozowApiKey').value = data.payment.ozowApiKey ? '••••••••' : '';
        document.getElementById('ozowPrivateKey').value = data.payment.ozowPrivateKey ? '••••••••' : '';
        document.getElementById('bankName').value = data.payment.bankName || '';
        document.getElementById('accountHolder').value = data.payment.accountHolder || '';
        document.getElementById('accountNumber').value = data.payment.accountNumber || '';
        document.getElementById('accountType').value = data.payment.accountType || '';

        const statusEl = document.getElementById('paymentStatus');
        if (data.payment.isConfigured) {
          statusEl.textContent = '✅ Payments configured';
          statusEl.className = 'success-message';
          statusEl.style.display = 'block';
        }
      }
    } catch (err) {
      console.error('Load settings error:', err);
    }
  }
});
