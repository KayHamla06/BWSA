// Customers page logic
document.addEventListener('DOMContentLoaded', () => {
  const customersBody = document.getElementById('customersBody');

  loadCustomers();

  async function loadCustomers() {
    try {
      const data = await api.get('/api/customers');
      const customers = data.customers || data;

      if (!customers || customers.length === 0) {
        customersBody.innerHTML = '<tr><td colspan="5" class="text-center">No customers yet</td></tr>';
        return;
      }

      customersBody.innerHTML = customers.map(c => `
        <tr>
          <td>${escapeHtml(c.name || 'Unknown')}</td>
          <td>${escapeHtml(c.whatsappNumber || 'N/A')}</td>
          <td>${c.orderCount || 0}</td>
          <td>R${(c.totalSpent || 0).toFixed(2)}</td>
          <td>${c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString() : 'Never'}</td>
        </tr>
      `).join('');
    } catch (err) {
      customersBody.innerHTML = '<tr><td colspan="5" class="text-center">Error loading customers</td></tr>';
      console.error('Load customers error:', err);
    }
  }
});

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
