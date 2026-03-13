// Dashboard page logic
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const stats = await api.get('/api/dashboard/stats');

    // Stats cards
    document.getElementById('totalRevenue').textContent =
      'R' + (stats.totalRevenue || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 });
    document.getElementById('ordersToday').textContent = stats.ordersToday || 0;
    document.getElementById('totalCustomers').textContent = stats.totalCustomers || 0;
    document.getElementById('totalOrders').textContent = stats.totalOrders || 0;

    // Top products
    const topBody = document.getElementById('topProductsBody');
    if (stats.topProducts && stats.topProducts.length > 0) {
      topBody.innerHTML = stats.topProducts.map(p => `
        <tr>
          <td>${escapeHtml(p.name)}</td>
          <td>${p.soldCount || 0}</td>
          <td>R${(p.revenue || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
        </tr>
      `).join('');
    } else {
      topBody.innerHTML = '<tr><td colspan="3" class="text-center">No products yet</td></tr>';
    }

    // Recent orders
    const ordersBody = document.getElementById('recentOrdersBody');
    if (stats.recentOrders && stats.recentOrders.length > 0) {
      ordersBody.innerHTML = stats.recentOrders.map(o => `
        <tr>
          <td>${escapeHtml(o.productSnapshot?.name || 'N/A')}</td>
          <td>${escapeHtml(o.customerPhone || 'N/A')}</td>
          <td>R${(o.amount || 0).toFixed(2)}</td>
          <td><span class="badge badge-${o.status}">${o.status}</span></td>
          <td>${new Date(o.createdAt).toLocaleDateString()}</td>
        </tr>
      `).join('');
    } else {
      ordersBody.innerHTML = '<tr><td colspan="5" class="text-center">No orders yet</td></tr>';
    }
  } catch (err) {
    console.error('Dashboard load error:', err);
  }
});

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ===== Real-time sales notifications (SSE) =====
(function initSSE() {
  const token = localStorage.getItem('token');
  if (!token) return;

  const sse = new EventSource(`/api/notifications/stream?token=${encodeURIComponent(token)}`);

  sse.addEventListener('sale', (e) => {
    try {
      const data = JSON.parse(e.data);
      showToast(`New sale: ${data.product} — R${Number(data.amount).toFixed(2)}`);
      // Refresh stats silently
      location.reload();
    } catch { /* ignore parse errors */ }
  });

  sse.onerror = () => {
    // Reconnect handled automatically by EventSource
  };
})();

function showToast(message) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.style.cssText = 'background:#075E54;color:#fff;padding:12px 20px;border-radius:8px;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.15);animation:slideIn .3s ease;max-width:340px;';
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity .3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}
