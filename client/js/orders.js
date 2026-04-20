// Orders page logic
document.addEventListener('DOMContentLoaded', () => {
  const ordersBody = document.getElementById('ordersBody');
  const statusFilter = document.getElementById('statusFilter');

  loadOrders();

  statusFilter.addEventListener('change', loadOrders);

  async function loadOrders() {
    try {
      const status = statusFilter.value;
      const url = status ? `/api/orders?status=${status}` : '/api/orders';
      const data = await api.get(url);
      const orders = data.orders || data;

      if (!orders || orders.length === 0) {
        ordersBody.innerHTML = '<tr><td colspan="6" class="text-center">No orders found</td></tr>';
        return;
      }

      ordersBody.innerHTML = orders.map(o => `
        <tr>
          <td>${escapeHtml(o.paymentReference || o._id || 'N/A')}</td>
          <td>${escapeHtml(o.customerPhone || 'N/A')}</td>
          <td>${escapeHtml(o.productSnapshot?.name || o.productId?.name || 'N/A')}</td>
          <td>R${(o.amount || 0).toFixed(2)}</td>
          <td><span class="badge badge-${String(o.displayStatus || 'PENDING').toLowerCase()}">${escapeHtml(o.displayStatus || 'PENDING')}</span></td>
          <td>${new Date(o.createdAt).toLocaleDateString()}</td>
        </tr>
      `).join('');
    } catch (err) {
      ordersBody.innerHTML = '<tr><td colspan="6" class="text-center">Error loading orders</td></tr>';
      console.error('Load orders error:', err);
    }
  }
});

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
