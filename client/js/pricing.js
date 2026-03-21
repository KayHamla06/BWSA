(async () => {
  const grid = document.getElementById('plansGrid');
  const token = localStorage.getItem('token');
  const isLoggedIn = !!token;

  try {
    const res  = await fetch('/api/subscription/plans');
    const data = await res.json();
    const plans = data.plans || [];
    if (!plans.length) { grid.innerHTML = '<p style="text-align:center;color:#aaa;">No plans available.</p>'; return; }

    // If logged in, get current plan
    let currentPlan = null;
    if (isLoggedIn) {
      try {
        const subRes = await fetch('/api/subscription', { headers: { 'Authorization': 'Bearer ' + token } });
        if (subRes.ok) {
          const subData = await subRes.json();
          currentPlan = subData.plan?.planKey || subData.planKey || null;
        }
      } catch (e) { /* ignore */ }
    }

    const ICONS  = { payg: '&#9889;', starter: '&#128640;', business: '&#128200;', pro: '&#9733;' };
    const COLORS = { payg: '#64748b', starter: '#3b82f6', business: '#128C7E', pro: '#7c3aed' };

    grid.innerHTML = plans.map(function (plan) {
      const icon    = ICONS[plan.planKey]  || '&#9679;';
      const color   = COLORS[plan.planKey] || '#128C7E';
      const price   = plan.price === 0 ? '<span class="plan-price-amount">Free</span>' : '<span class="plan-price-amount">R' + plan.price + '</span><span class="plan-price-period">/mo</span>';
      const badge   = plan.badge ? '<div class="plan-badge" style="background:' + color + '">' + plan.badge + '</div>' : '';
      const trial   = plan.trialDays ? '<div class="plan-trial-note">&#10003; ' + plan.trialDays + '-day free trial</div>' : '';
      const cls     = plan.highlight ? 'plan-card highlighted' : 'plan-card';
      const features = (plan.features || []).map(function (f) { return '<li class="plan-feature-item">&#10003; ' + f + '</li>'; }).join('');

      let ctaHtml;
      if (isLoggedIn && currentPlan === plan.planKey) {
        ctaHtml = '<span class="plan-cta-btn plan-cta-current" style="background:#e5e7eb;color:#6b7280;cursor:default;">Current Plan</span>';
      } else if (isLoggedIn && plan.price > 0) {
        ctaHtml = '<button class="plan-cta-btn plan-cta-pay" style="background:' + color + ';" data-plan="' + plan.planKey + '" data-action="pay">Pay Now \u2013 R' + plan.price + '/mo</button>';
      } else if (isLoggedIn && plan.price === 0) {
        ctaHtml = '<button class="plan-cta-btn" style="background:' + color + ';" data-plan="' + plan.planKey + '" data-action="free">Switch to Free</button>';
      } else {
        var href = '/register?plan=' + plan.planKey;
        ctaHtml = '<a href="' + href + '" class="plan-cta-btn" style="background:' + color + ';">' + (plan.price === 0 ? 'Get Started' : (plan.trialDays ? 'Start Free Trial' : 'Choose Plan')) + '</a>';
      }

      return '<div class="' + cls + '" style="--plan-color:' + color + '">' +
        badge +
        '<div class="plan-icon" style="color:' + color + ';font-size:2rem;">' + icon + '</div>' +
        '<div class="plan-name">' + plan.name + '</div>' +
        '<div class="plan-price">' + price + '</div>' +
        '<div class="plan-fee">Transaction fee: <strong>' + plan.transactionFeePercent + '%</strong></div>' +
        trial +
        '<ul class="plan-features-list">' + features + '</ul>' +
        ctaHtml +
      '</div>';
    }).join('');

    // Show nav links based on auth state
    if (isLoggedIn) {
      const navLinks = document.querySelector('.pricing-page-nav .nav-links');
      if (navLinks) {
        navLinks.innerHTML = '<a href="/dashboard">Dashboard</a><a href="/settings">Settings</a>';
      }
    }

    // Event delegation for plan buttons
    grid.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      if (btn.dataset.action === 'pay') payForPlan(btn.dataset.plan);
      if (btn.dataset.action === 'free') switchToFreePlan();
    });

    // Check for subscription cancellation message
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('subscription') === 'cancelled') {
      showPaymentToast('Payment was cancelled. You can try again when you\'re ready.', 'warning');
    }

  } catch (e) {
    grid.innerHTML = '<p style="text-align:center;color:#e74c3c;">Could not load plans. Please refresh.</p>';
  }
})();

async function payForPlan(planKey) {
  const token = localStorage.getItem('token');
  if (!token) { window.location.href = '/login'; return; }

  const btn = document.querySelector('[data-plan="' + planKey + '"]');
  if (btn) { btn.textContent = 'Processing...'; btn.disabled = true; }

  try {
    const res = await fetch('/api/subscription/pay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
      },
      body: JSON.stringify({ planKey: planKey }),
    });

    const data = await res.json();
    if (data.success && data.redirectUrl) {
      window.location.href = data.redirectUrl;
    } else {
      showPaymentToast(data.message || 'Failed to create payment. Please try again.', 'error');
      if (btn) { btn.textContent = 'Pay Now'; btn.disabled = false; }
    }
  } catch (err) {
    showPaymentToast('Something went wrong. Please try again.', 'error');
    if (btn) { btn.textContent = 'Pay Now'; btn.disabled = false; }
  }
}

async function switchToFreePlan() {
  const token = localStorage.getItem('token');
  if (!token) { window.location.href = '/login'; return; }

  try {
    const res = await fetch('/api/subscription/change', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
      },
      body: JSON.stringify({ planKey: 'payg' }),
    });
    const data = await res.json();
    if (data.success) {
      showPaymentToast('Switched to Free plan.', 'success');
      setTimeout(function () { window.location.reload(); }, 1500);
    } else {
      showPaymentToast(data.message || 'Failed to switch plan.', 'error');
    }
  } catch (err) {
    showPaymentToast('Something went wrong.', 'error');
  }
}

function showPaymentToast(message, type) {
  const existing = document.querySelector('.payment-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'payment-toast payment-toast-' + type;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(function () { toast.classList.add('show'); }, 10);
  setTimeout(function () { toast.classList.remove('show'); setTimeout(function () { toast.remove(); }, 300); }, 4000);
}
