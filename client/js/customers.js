// Customers page logic
document.addEventListener('DOMContentLoaded', () => {
  const customersBody = document.getElementById('customersBody');
  const customerSearch = document.getElementById('customerSearch');
  const customerSegment = document.getElementById('customerSegment');
  const campaignForm = document.getElementById('campaignForm');
  const campaignHistory = document.getElementById('campaignHistory');

  loadCustomers();
  loadCampaigns();

  customerSearch.addEventListener('input', loadCustomers);
  customerSegment.addEventListener('change', () => {
    loadCustomers();
    loadCampaigns();
  });

  campaignForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = campaignForm.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Queueing...';

    try {
      await api.post('/api/campaigns', {
        message: document.getElementById('campaignMessage').value,
        segment: customerSegment.value,
        templateName: document.getElementById('templateName').value,
        templateLanguage: document.getElementById('templateLanguage').value || 'en',
        messageParameters: [document.getElementById('campaignMessage').value],
      });
      showToast('Campaign queued for delivery.', 'success');
      campaignForm.reset();
      document.getElementById('templateLanguage').value = 'en';
      loadCampaigns();
    } catch (err) {
      showToast(err.message || 'Failed to queue campaign.', 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'Queue Campaign';
    }
  });

  async function loadCustomers() {
    try {
      const params = new URLSearchParams();
      if (customerSearch.value.trim()) params.set('search', customerSearch.value.trim());
      if (customerSegment.value) params.set('segment', customerSegment.value);

      const data = await api.get(`/api/customers${params.toString() ? `?${params.toString()}` : ''}`);
      const customers = data.customers || data;

      if (!customers || customers.length === 0) {
        customersBody.innerHTML = '<tr><td colspan="6" class="text-center">No customers yet</td></tr>';
        return;
      }

      customersBody.innerHTML = customers.map(c => `
        <tr>
          <td>${escapeHtml(c.name || 'Unknown')}</td>
          <td>${escapeHtml(c.whatsappNumber || 'N/A')}</td>
          <td>${c.totalOrders || c.orderCount || 0}</td>
          <td>R${(c.totalSpent || 0).toFixed(2)}</td>
          <td>${c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString() : 'Never'}</td>
          <td>${c.lastContactDate ? new Date(c.lastContactDate).toLocaleDateString() : 'Never'}</td>
        </tr>
      `).join('');
    } catch (err) {
      customersBody.innerHTML = '<tr><td colspan="6" class="text-center">Error loading customers</td></tr>';
      console.error('Load customers error:', err);
    }
  }

  async function loadCampaigns() {
    try {
      const data = await api.get('/api/campaigns');
      const campaigns = data.campaigns || [];

      if (campaigns.length === 0) {
        campaignHistory.innerHTML = '<p class="text-muted">No campaigns sent yet.</p>';
        return;
      }

      campaignHistory.innerHTML = campaigns.slice(0, 5).map((campaign) => `
        <div class="stack-item">
          <strong>${escapeHtml(campaign.templateName)}</strong>
          <span>${escapeHtml(campaign.segment)} segment</span>
          <span>${campaign.sentCount || 0} sent${campaign.failedCount ? `, ${campaign.failedCount} failed` : ''}</span>
        </div>
      `).join('');
    } catch (err) {
      campaignHistory.innerHTML = '<p class="text-muted">Unable to load campaigns.</p>';
    }
  }
});

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
