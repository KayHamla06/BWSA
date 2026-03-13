// Payments page logic
document.addEventListener('DOMContentLoaded', () => {
  const paymentsBody = document.getElementById('paymentsBody');
  const modal = document.getElementById('paymentModal');
  const paymentForm = document.getElementById('paymentForm');

  loadPayments();

  document.getElementById('createPaymentBtn').addEventListener('click', () => {
    modal.style.display = 'flex';
  });

  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('cancelPayBtn').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
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
      alert('Payment link sent via WhatsApp!');
    } catch (err) {
      alert(err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Send Link';
    }
  });

  async function loadPayments() {
    try {
      const data = await api.get('/api/payments');
      const payments = data.payments || data;

      if (!payments || payments.length === 0) {
        paymentsBody.innerHTML = '<tr><td colspan="5" class="text-center">No payments yet</td></tr>';
        return;
      }

      paymentsBody.innerHTML = payments.map(p => `
        <tr>
          <td>${escapeHtml(p.paymentReference || p._id)}</td>
          <td>R${(p.amount || 0).toFixed(2)}</td>
          <td><span class="badge badge-${p.status}">${p.status}</span></td>
          <td>${escapeHtml(p.method || 'Ozow')}</td>
          <td>${new Date(p.createdAt).toLocaleDateString()}</td>
        </tr>
      `).join('');
    } catch (err) {
      paymentsBody.innerHTML = '<tr><td colspan="5" class="text-center">Error loading payments</td></tr>';
      console.error('Load payments error:', err);
    }
  }

  function closeModal() {
    modal.style.display = 'none';
    paymentForm.reset();
  }
});

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
