/* ===== DASHBOARD CONTROLLER ===== */

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const stats = await api.get('/api/dashboard/stats');
    renderStats(stats);
    renderCharts(stats);
    renderTables(stats);
    if (stats.subscription) renderSubscriptionSection(stats.subscription, stats.totalRevenue || 0);
  } catch (err) {
    console.error('Dashboard load error:', err);
    showToast('Failed to load dashboard data.', 'error');
  }
});

/* -- Stats Cards -- */
function renderStats(stats) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('totalRevenue',       'R' + (stats.totalRevenue || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 }));
  set('ordersToday',        stats.ordersToday || 0);
  set('totalCustomers',     stats.totalCustomers || 0);
  set('totalOrders',        stats.totalOrders || 0);
  set('receiptsToday',      stats.receiptsToday || 0);
  set('ubuntuPayBalance',   'R' + (stats.ubuntuPayBalance || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 }));
  set('receiptsWeek',       stats.receiptsWeek || 0);
  set('receiptsMonth',      stats.receiptsMonth || 0);
  set('approvedPayments',   stats.approvedPayments || 0);
  set('declinedPayments',   stats.declinedPayments || 0);
  set('pendingOrders',      stats.pendingOrders || 0);
  set('pendingWithdrawals', stats.pendingWithdrawals || 0);

  const flowMessage = document.getElementById('paymentFlowMessage');
  if (flowMessage) {
    if (stats.paymentFlow === 'payfast_direct') {
      flowMessage.textContent = 'Direct PayFast is active. Customer payments go straight to your PayFast account.';
    } else {
      flowMessage.textContent = `Ubuntu Pay is active. Balance: R${(stats.ubuntuPayBalance || 0).toFixed(2)}. Pending: R${(stats.ubuntuPayPendingBalance || 0).toFixed(2)}.`;
    }
  }
}

/* -- Charts -- */
function renderCharts(stats) {
  renderMiniChart('dailyRevenueChart',   stats.dailyRevenue   || [], 'R');
  renderMiniChart('ordersPerDayChart',   stats.ordersPerDay   || []);
  renderMiniChart('customerGrowthChart', stats.customerGrowth || []);
}

/* -- Tables -- */
function renderTables(stats) {
  const topBody = document.getElementById('topProductsBody');
  if (topBody) {
    topBody.innerHTML = (stats.topProducts && stats.topProducts.length > 0)
      ? stats.topProducts.map(p =>
          `<tr><td>${escapeHtml(p.name)}</td><td>${p.soldCount || 0}</td><td>R${(p.revenue || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td></tr>`
        ).join('')
      : '<tr><td colspan="3" class="text-center">No products yet</td></tr>';
  }

  const ordersBody = document.getElementById('recentOrdersBody');
  if (ordersBody) {
    ordersBody.innerHTML = (stats.recentOrders && stats.recentOrders.length > 0)
      ? stats.recentOrders.map(o =>
          `<tr><td>${escapeHtml(o.productSnapshot?.name || 'N/A')}</td><td>${escapeHtml(o.customerPhone || 'N/A')}</td><td>R${(o.amount || 0).toFixed(2)}</td><td><span class="badge badge-${escapeHtml((o.status || '').toLowerCase())}">${escapeHtml(o.status || '')}</span></td><td>${new Date(o.createdAt).toLocaleDateString('en-ZA')}</td></tr>`
        ).join('')
      : '<tr><td colspan="5" class="text-center">No orders yet</td></tr>';
  }
}

/* -- Subscription / Plan Section -- */
function renderSubscriptionSection(sub, totalRevenue) {
  const section     = document.getElementById('subscriptionSection');
  const usageSec    = document.getElementById('usageMetersSection');
  const feeSec      = document.getElementById('feeSummarySection');
  const upgradeWrap = document.getElementById('upgradeLinkWrap');
  if (!section) return;

  const plan        = sub.plan        || {};
  const products    = sub.products    || {};
  const customers   = sub.customers   || {};
  const messages    = sub.messages    || {};
  const trialActive = !!sub.trialActive;
  const planName    = plan.name || 'Pay-per-Use';
  const planPrice   = plan.price === 0 ? 'Free' : `R${plan.price}/mo`;
  const feePercent  = plan.transactionFeePercent || 4;
  const isPayg      = (plan.planKey || 'payg') === 'payg';
  const trialEndsAt = sub.trialEndsAt;

  const bannerClass = trialActive ? 'trial' : isPayg ? 'upgrade-prompt' : '';
  const bannerMsg   = trialActive
    ? `Trial ends ${trialEndsAt ? new Date(trialEndsAt).toLocaleDateString('en-ZA') : 'soon'}.`
    : isPayg
      ? 'You are on the free plan. Upgrade to unlock more products, customers, and features.'
      : `You are on the <strong>${escapeHtml(planName)}</strong> plan (${escapeHtml(planPrice)}).`;

  section.innerHTML = `
    <div class="subscription-banner ${bannerClass}">
      <div class="sub-banner-icon">&#9889;</div>
      <div class="sub-banner-info">
        <div class="sub-banner-title">${escapeHtml(planName)} Plan${trialActive ? ' - Free Trial' : ''}</div>
        <div class="sub-banner-sub">${bannerMsg}</div>
      </div>
      <div class="sub-banner-actions">
        <a href="/pricing" class="btn btn-primary" style="font-size:13px;padding:8px 16px;">${isPayg || trialActive ? 'Upgrade Now' : 'Change Plan'}</a>
      </div>
    </div>`;

  const alerts = [];
  if (!products.unlimited && products.warning) alerts.push(buildAlert('Products',  products.current,  products.limit,  products.pct));
  if (!customers.unlimited && customers.warning) alerts.push(buildAlert('Customers', customers.current, customers.limit, customers.pct));
  if (messages.warning) alerts.push(buildAlert('Messages', messages.used, messages.limit, messages.pct));
  if (alerts.length) section.insertAdjacentHTML('beforeend', alerts.join(''));

  if (usageSec) {
    usageSec.innerHTML = [
      buildMeter('Products',          products.unlimited  ? null : products.current,  products.unlimited  ? 'Unlimited' : products.limit,  products.pct  || 0),
      buildMeter('Customers',         customers.unlimited ? null : customers.current, customers.unlimited ? 'Unlimited' : customers.limit, customers.pct || 0),
      buildMeter('Messages (period)', messages.used || 0, messages.limit, messages.pct || 0),
    ].join('');
  }

  if (upgradeWrap && (products.warning || customers.warning || messages.warning || isPayg)) {
    upgradeWrap.innerHTML = `<a href="/pricing" class="btn btn-primary" style="width:100%;display:block;text-align:center;padding:10px;">Upgrade Plan</a>`;
  }

  if (feeSec) {
    const estFee = totalRevenue > 0 ? Number((totalRevenue * feePercent / 100).toFixed(2)) : 0;
    const netRev = totalRevenue > 0 ? Number((totalRevenue - estFee).toFixed(2)) : 0;
    feeSec.innerHTML = `
      <div class="fee-summary-card">
        <div class="fee-row"><span class="fee-label">Plan</span><span class="fee-value">${escapeHtml(planName)}</span></div>
        <div class="fee-row"><span class="fee-label">Fee Rate</span><span class="fee-value">${feePercent}%</span></div>
        <div class="fee-row"><span class="fee-label">Total Revenue</span><span class="fee-value">R${totalRevenue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span></div>
        ${totalRevenue > 0 ? `
        <div class="fee-row"><span class="fee-label">Fees Paid (est.)</span><span class="fee-value">R${estFee.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span></div>
        <div class="fee-row"><span class="fee-label">Net Revenue</span><span class="fee-value highlight">R${netRev.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span></div>` : ''}
      </div>
      <p style="font-size:12px;color:var(--text-muted);margin-top:10px;">Lower your fee rate with a <a href="/pricing" style="color:var(--primary-dark);">higher plan</a>.</p>`;
  }
}

function buildAlert(label, current, limit, pct) {
  const sev = pct >= 100 ? 'danger' : 'warning';
  return `<div class="limit-alert limit-alert-${sev}"><span class="limit-alert-icon">${pct >= 100 ? '&#9940;' : '&#9888;&#65039;'}</span><span>${escapeHtml(label)}: <strong>${current}/${limit}</strong> (${pct}%). <a href="/pricing" style="color:inherit;font-weight:700;">Upgrade.</a></span></div>`;
}

function buildMeter(label, current, limit, pct) {
  const fillClass   = pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : '';
  const isUnlimited = limit === 'Unlimited';
  const countText   = isUnlimited ? `${current != null ? current : 0} / Unlimited` : `${current != null ? current : 0} / ${limit}`;
  return `<div class="usage-meter">
    <div class="usage-meter-header">
      <span class="usage-meter-label">${escapeHtml(String(label))}</span>
      <span class="usage-meter-count">${escapeHtml(countText)}</span>
    </div>
    ${!isUnlimited
      ? `<div class="usage-meter-bar"><div class="usage-meter-fill ${fillClass}" style="width:${Math.min(pct, 100)}%;"></div></div>`
      : `<div style="font-size:12px;color:var(--primary-dark);">Unlimited on your plan</div>`}
  </div>`;
}

/* -- SSE Real-time Notifications -- */
(function initSSE() {
  const token = localStorage.getItem('token');
  if (!token) return;
  const sse = new EventSource(`/api/notifications/stream?token=${encodeURIComponent(token)}`);
  sse.addEventListener('sale', (e) => {
    try {
      const data = JSON.parse(e.data);
      showToast(`New sale: ${data.product} - R${Number(data.amount).toFixed(2)}`, 'success');
      setTimeout(() => location.reload(), 2500);
    } catch { /* ignore */ }
  });
  sse.onerror = () => {};
})();

/* -- Helpers -- */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function showToast(message, type) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  const bg = type === 'error' ? '#c0392b' : '#075E54';
  toast.style.cssText = `background:${bg};color:#fff;padding:12px 20px;border-radius:8px;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.15);max-width:340px;`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity .3s'; setTimeout(() => toast.remove(), 300); }, 5000);
}

function renderMiniChart(containerId, points, prefix) {
  prefix = prefix || '';
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!points || !points.length) {
    container.innerHTML = '<p class="text-muted" style="font-size:13px;">No data yet.</p>';
    return;
  }
  const maxValue = Math.max(...points.map(p => Number(p.value) || 0), 1);
  container.innerHTML = points.map(point => {
    const value  = Number(point.value) || 0;
    const height = Math.max(12, Math.round((value / maxValue) * 100));
    return `<div class="mini-chart-bar-wrap"><div class="mini-chart-value">${prefix}${prefix === 'R' ? value.toFixed(0) : value}</div><div class="mini-chart-bar" style="height:${height}%"></div><div class="mini-chart-label">${escapeHtml(point.label)}</div></div>`;
  }).join('');
}
