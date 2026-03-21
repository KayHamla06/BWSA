/* ===== DASHBOARD CONTROLLER ===== */

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const stats = await api.get('/api/dashboard/stats');
    renderStats(stats);
    renderCharts(stats);
    renderTables(stats);
    if (stats.suspension && stats.suspension.suspended) {
      renderSuspensionAlert(stats.suspension.reason);
    }
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
  const trialExpired = !!sub.trialExpired;
  const daysLeft    = sub.trialDaysLeft || 0;
  const trialWarning = !!sub.trialWarning;
  const needsPayment = !!sub.needsPayment;
  const planName    = plan.name || 'Pay-per-Use';
  const planPrice   = plan.price === 0 ? 'Free' : `R${plan.price}/mo`;
  const feePercent  = plan.transactionFeePercent || 4;
  const trialEndsAt = sub.trialEndsAt;

  let bannerClass = '';
  let bannerMsg   = '';
  let bannerTitle = '';

  if (trialExpired) {
    bannerClass = 'trial-expired';
    bannerTitle = 'Free Trial Ended';
    bannerMsg   = 'Your 14-day free trial has expired. Subscribe now to continue using the platform.';
  } else if (trialActive && trialWarning) {
    bannerClass = 'trial-warning';
    bannerTitle = `${escapeHtml(planName)} Plan - Trial Ending Soon`;
    bannerMsg   = `Only <strong>${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong> left in your free trial! Subscribe before it ends to keep using all features.`;
  } else if (trialActive) {
    bannerClass = 'trial';
    bannerTitle = `${escapeHtml(planName)} Plan - Free Trial`;
    bannerMsg   = `You have <strong>${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong> remaining in your free trial (ends ${trialEndsAt ? new Date(trialEndsAt).toLocaleDateString('en-ZA') : 'soon'}).`;
  } else {
    bannerClass = '';
    bannerTitle = `${escapeHtml(planName)} Plan`;
    bannerMsg   = `You are on the <strong>${escapeHtml(planName)}</strong> plan (${escapeHtml(planPrice)}).`;
  }

  section.innerHTML = `
    <div class="subscription-banner ${bannerClass}">
      <div class="sub-banner-icon">${trialExpired ? '&#9940;' : trialWarning ? '&#9888;&#65039;' : '&#9889;'}</div>
      <div class="sub-banner-info">
        <div class="sub-banner-title">${bannerTitle}</div>
        <div class="sub-banner-sub">${bannerMsg}</div>
      </div>
      <div class="sub-banner-actions">
        ${needsPayment || trialExpired
          ? `<button id="openPlanSelectorBtn" class="btn btn-primary" style="font-size:13px;padding:8px 16px;">Pay Now</button>`
          : trialActive
            ? `<button id="openPlanSelectorBtn" class="btn btn-primary" style="font-size:13px;padding:8px 16px;">Subscribe Now</button>`
            : `<a href="/pricing" class="btn btn-primary" style="font-size:13px;padding:8px 16px;">Change Plan</a>`
        }
      </div>
    </div>`;

  // Bind plan selector button
  const psBtn = document.getElementById('openPlanSelectorBtn');
  if (psBtn) psBtn.addEventListener('click', openPlanSelector);

  // Trial countdown progress bar
  if (trialActive || trialExpired) {
    const totalDays = 14;
    const elapsed = totalDays - daysLeft;
    const pct = Math.min(100, Math.round((elapsed / totalDays) * 100));
    const barClass = trialExpired ? 'danger' : trialWarning ? 'warning' : '';
    section.insertAdjacentHTML('beforeend', `
      <div class="trial-countdown-bar">
        <div class="trial-countdown-header">
          <span class="trial-countdown-label">${trialExpired ? 'Trial expired' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`}</span>
          <span class="trial-countdown-dates">${trialExpired ? 'Please subscribe to continue' : `Day ${elapsed} of ${totalDays}`}</span>
        </div>
        <div class="usage-meter-bar"><div class="usage-meter-fill ${barClass}" style="width:${pct}%;"></div></div>
      </div>`);
  }

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

/* -- Suspension Alert -- */
function renderSuspensionAlert(reason) {
  const contentArea = document.querySelector('.content-area');
  if (!contentArea) return;
  const alert = document.createElement('div');
  alert.className = 'suspension-alert';
  alert.innerHTML = `
    <div class="suspension-alert-icon">&#9888;&#65039;</div>
    <div class="suspension-alert-body">
      <div class="suspension-alert-title">Your account has been suspended</div>
      <div class="suspension-alert-reason">Reason: ${escapeHtml(reason)}</div>
      <div class="suspension-alert-info">You can still view your data and receive payments, but you cannot add products, create payment links, withdraw funds, or perform other actions until the suspension is lifted. Please contact support if you believe this is an error.</div>
    </div>
  `;
  contentArea.insertBefore(alert, contentArea.firstChild);
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

/* -- Plan Selector Modal (Pay Now) -- */
function openPlanSelector() {
  // Remove existing modal if any
  const existing = document.getElementById('planSelectorModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'planSelectorModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;max-width:520px;width:100%;padding:32px;box-shadow:0 20px 60px rgba(0,0,0,0.2);max-height:90vh;overflow-y:auto;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
        <h2 style="margin:0;font-size:1.4rem;color:#1a1a2e;">Choose a Plan</h2>
        <button id="planSelectorClose" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:#666;">&times;</button>
      </div>
      <div id="planSelectorContent" style="text-align:center;padding:20px;color:#666;">Loading plans...</div>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelector('#planSelectorClose').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  loadPlanOptions();
}

async function loadPlanOptions() {
  const content = document.getElementById('planSelectorContent');
  try {
    const res = await fetch('/api/subscription/plans');
    const data = await res.json();
    const plans = (data.plans || []).filter(p => p.price > 0);
    if (!plans.length) { content.innerHTML = '<p>No paid plans available.</p>'; return; }

    const COLORS = { starter: '#3b82f6', business: '#128C7E', pro: '#7c3aed' };
    content.innerHTML = plans.map(p => {
      const color = COLORS[p.planKey] || '#128C7E';
      return `
        <div class="plan-option-card" data-hover-color="${color}" style="border:2px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:12px;text-align:left;transition:border-color .2s;cursor:pointer;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="font-weight:700;font-size:1.1rem;color:#1a1a2e;">${escapeHtml(p.name)}</div>
              <div style="color:#64748b;font-size:0.85rem;margin-top:4px;">${p.transactionFeePercent}% transaction fee &middot; ${p.limits?.products === -1 ? 'Unlimited' : p.limits?.products} products</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:1.3rem;font-weight:700;color:${color};">R${p.price}<span style="font-size:0.8rem;font-weight:400;color:#64748b;">/mo</span></div>
            </div>
          </div>
          <button data-pay-plan="${p.planKey}" style="margin-top:12px;width:100%;padding:10px;background:${color};color:#fff;border:none;border-radius:8px;font-size:0.95rem;font-weight:600;cursor:pointer;">
            Pay Now – R${p.price}/mo
          </button>
        </div>`;
    }).join('');

    // Event delegation for pay buttons and hover
    content.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-pay-plan]');
      if (btn) payForPlanDashboard(btn.dataset.payPlan, btn);
    });
    content.addEventListener('mouseover', (e) => {
      const card = e.target.closest('.plan-option-card');
      if (card) card.style.borderColor = card.dataset.hoverColor;
    });
    content.addEventListener('mouseout', (e) => {
      const card = e.target.closest('.plan-option-card');
      if (card) card.style.borderColor = '#e5e7eb';
    });
  } catch (e) {
    content.innerHTML = '<p style="color:#e74c3c;">Failed to load plans. Please try again.</p>';
  }
}

async function payForPlanDashboard(planKey, btn) {
  const token = localStorage.getItem('token');
  if (!token) { window.location.href = '/login'; return; }

  const originalText = btn.textContent;
  btn.textContent = 'Processing...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/subscription/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ planKey }),
    });
    const data = await res.json();
    if (data.success && data.redirectUrl) {
      window.location.href = data.redirectUrl;
    } else {
      showToast(data.message || 'Failed to initiate payment.', 'error');
      btn.textContent = originalText;
      btn.disabled = false;
    }
  } catch (err) {
    showToast('Something went wrong. Please try again.', 'error');
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

/* -- Handle subscription success/cancel redirect -- */
(function handleSubscriptionReturn() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('subscription') === 'success') {
    const plan = params.get('plan') || '';
    showToast(`Payment successful! Your ${plan} plan is being activated.`, 'success');
    // Clean up URL
    const url = new URL(window.location);
    url.searchParams.delete('subscription');
    url.searchParams.delete('plan');
    window.history.replaceState({}, '', url.pathname);
  }
})();
