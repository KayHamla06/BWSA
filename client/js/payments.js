// Payments page logic
document.addEventListener('DOMContentLoaded', () => {
  const paymentsBody = document.getElementById('paymentsBody');
  const modal = document.getElementById('paymentModal');
  const paymentForm = document.getElementById('paymentForm');
  const withdrawalModal = document.getElementById('withdrawalModal');
  const withdrawalForm = document.getElementById('withdrawalForm');
  const withdrawalsBody = document.getElementById('withdrawalsBody');

  loadWallet();
  loadPayments();
  loadWithdrawals();

  document.getElementById('createPaymentBtn').addEventListener('click', () => {
    modal.hidden = false;
  });

  function openWithdrawalModal() {
    withdrawalModal.hidden = false;
  }

  document.getElementById('withdrawBtn').addEventListener('click', openWithdrawalModal);
  document.getElementById('requestWithdrawalBtn').addEventListener('click', openWithdrawalModal);

  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('cancelPayBtn').addEventListener('click', closeModal);
  document.getElementById('withdrawalModalClose').addEventListener('click', closeWithdrawalModal);
  document.getElementById('cancelWithdrawalBtn').addEventListener('click', closeWithdrawalModal);
  document.getElementById('withdrawMethod').addEventListener('change', toggleWithdrawalMethod);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  withdrawalModal.addEventListener('click', (e) => {
    if (e.target === withdrawalModal) closeWithdrawalModal();
  });

  paymentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = paymentForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Sending...';

    try {
      await api.post('/api/payments/create-link', {
        customerName: document.getElementById('custName').value,
        customerPhone: document.getElementById('custPhone').value,
        customerEmail: document.getElementById('custEmail').value,
        amount: parseFloat(document.getElementById('payAmount').value),
        reason: document.getElementById('payReason').value,
      });
      closeModal();
      loadPayments();
      showToast('Payment link sent via WhatsApp!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Send Link';
    }
  });

  withdrawalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = withdrawalForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Submitting...';

    try {
      const payload = {
        amount: parseFloat(document.getElementById('withdrawAmount').value),
        payoutMethod: document.getElementById('withdrawMethod').value,
        disclaimerAccepted: document.getElementById('immediateDisclaimer').checked,
        payshapId: document.getElementById('withdrawPayshapId').value,
        qrPaymentDetails: document.getElementById('withdrawQrPaymentDetails').value,
        capitecNumber: document.getElementById('withdrawCapitecNumber').value,
        capitecSurname: document.getElementById('withdrawCapitecSurname').value,
      };

      const response = await api.post('/api/payments/withdrawals', payload);
      showToast(response.message || 'Withdrawal request submitted.', 'success');
      closeWithdrawalModal();
      loadWallet();
      loadWithdrawals();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Submit Withdrawal';
    }
  });

  async function loadWallet() {
    try {
      const data = await api.get('/api/payments/wallet');
      document.getElementById('walletAvailableBalance').textContent = `R${Number(data.ubuntuPayAccount?.availableBalance || 0).toFixed(2)}`;
      document.getElementById('walletPendingBalance').textContent = `R${Number(data.ubuntuPayAccount?.pendingBalance || 0).toFixed(2)}`;
      document.getElementById('walletPendingWithdrawals').textContent = data.recentWithdrawals?.filter((item) => ['pending', 'processing'].includes(item.status)).length || 0;
      document.getElementById('walletPaymentFlow').textContent = data.paymentFlow === 'payfast_direct' ? 'Direct PayFast' : 'Ubuntu Pay';

      const noticeMessage = document.getElementById('walletNoticeMessage');
      const withdrawalButton = document.getElementById('requestWithdrawalBtn');
      if (data.paymentFlow === 'payfast_direct') {
        noticeMessage.textContent = 'Direct PayFast is active. Payments go straight to your PayFast account, so Ubuntu Pay withdrawals are disabled.';
        withdrawalButton.disabled = true;
      } else if (data.ubuntuPayAccount?.walletStatus === 'locked') {
        noticeMessage.textContent = 'Your wallet is locked while a withdrawal is processing. You cannot create another withdrawal yet.';
        withdrawalButton.disabled = true;
      } else {
        noticeMessage.textContent = 'Submit a withdrawal request. Funds may take 30 minutes to 1 hour to reflect in your bank account.';
        withdrawalButton.disabled = false;
      }
    } catch (err) {
      console.error('Load wallet error:', err);
    }
  }

  async function loadPayments() {
    try {
      const data = await api.get('/api/payments');
      const payments = data.payments || data;

      if (!payments || payments.length === 0) {
        paymentsBody.innerHTML = '<tr><td colspan="6" class="text-center">No payments yet</td></tr>';
        return;
      }

      paymentsBody.innerHTML = payments.map(p => `
        <tr>
          <td>${escapeHtml(p.paymentReference || p._id)}</td>
          <td>R${(p.amount || 0).toFixed(2)}</td>
          <td><span class="badge badge-${p.status}">${p.status}</span></td>
          <td>${escapeHtml(p.paymentFlow === 'payfast_direct' ? 'Direct PayFast' : 'Ubuntu Pay')}</td>
          <td>${escapeHtml(p.paymentMethod || 'PayFast')}</td>
          <td>${new Date(p.createdAt).toLocaleDateString()}</td>
        </tr>
      `).join('');
    } catch (err) {
      paymentsBody.innerHTML = '<tr><td colspan="6" class="text-center">Error loading payments</td></tr>';
      console.error('Load payments error:', err);
    }
  }

  async function loadWithdrawals() {
    try {
      const data = await api.get('/api/payments/withdrawals');
      const withdrawals = data.withdrawals || [];

      if (!withdrawals.length) {
        withdrawalsBody.innerHTML = '<tr><td colspan="5" class="text-center">No withdrawals yet</td></tr>';
        return;
      }

      withdrawalsBody.innerHTML = withdrawals.map((item) => `
        <tr>
          <td>R${Number(item.amount || 0).toFixed(2)}</td>
          <td>${escapeHtml(item.payoutMethod)}</td>
          <td><span class="badge badge-${item.status}">${escapeHtml(item.status)}</span></td>
          <td>${new Date(item.createdAt).toLocaleString()}</td>
          <td>${escapeHtml(item.processingMessage || '')}</td>
        </tr>
      `).join('');
    } catch (err) {
      withdrawalsBody.innerHTML = '<tr><td colspan="5" class="text-center">Error loading withdrawals</td></tr>';
      console.error('Load withdrawals error:', err);
    }
  }

  function toggleWithdrawalMethod() {
    const method = document.getElementById('withdrawMethod').value;
    document.getElementById('immediateWarning').hidden = method !== 'immediate';
    document.getElementById('immediateConfirmGroup').hidden = method !== 'immediate';
    document.getElementById('payshapGroup').hidden = method !== 'payshap';
    document.getElementById('qrGroup').hidden = method !== 'qr';
    document.getElementById('capitecGroup').hidden = method !== 'capitec';
  }

  function closeModal() {
    modal.hidden = true;
    paymentForm.reset();
  }

  function closeWithdrawalModal() {
    withdrawalModal.hidden = true;
    withdrawalForm.reset();
    toggleWithdrawalMethod();
  }

  toggleWithdrawalMethod();
});

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
