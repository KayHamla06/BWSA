// App — auth guard, sidebar toggle, logout, user display, plan feature gating
(function () {
  const publicPages = ['/login', '/register', '/verify', '/pricing'];
  const currentPath = window.location.pathname;

  // Auth guard: redirect to login if no token on protected pages
  if (!publicPages.includes(currentPath)) {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }
  }

  // Redirect away from auth pages if already logged in
  if (['/login', '/register', '/verify'].includes(currentPath)) {
    const token = localStorage.getItem('token');
    if (token) {
      window.location.href = '/dashboard';
      return;
    }
  }

  // Feature-to-page mapping: which feature is required to visit a page
  const PAGE_FEATURE_MAP = {
    '/orders': 'order_tracking',
  };

  // Wait for DOM
  document.addEventListener('DOMContentLoaded', async () => {
    // Sidebar toggle (mobile)
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sidebar = document.getElementById('sidebar');
    const sidebarClose = document.getElementById('sidebarClose');

    // Create overlay for mobile sidebar
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay && sidebar) {
      overlay = document.createElement('div');
      overlay.className = 'sidebar-overlay';
      document.body.appendChild(overlay);
    }

    function openSidebar() {
      if (sidebar) sidebar.classList.add('open');
      if (overlay) overlay.classList.add('active');
    }

    function closeSidebar() {
      if (sidebar) sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('active');
    }

    if (hamburgerBtn) hamburgerBtn.addEventListener('click', openSidebar);
    if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userFeatures');
        window.location.href = '/login';
      });
    }

    // Show user name in topbar
    const topbarUser = document.getElementById('topbarUser');
    if (topbarUser) {
      try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
          topbarUser.textContent = '';
          if (user.logo) {
            const image = document.createElement('img');
            image.src = user.logo;
            image.alt = `${user.businessName || user.name || 'Business'} logo`;
            image.className = 'topbar-user-logo';
            topbarUser.appendChild(image);
          }

          const label = document.createElement('span');
          label.className = user.logo ? 'topbar-user-label' : 'topbar-user-fallback';
          label.textContent = user.businessName || user.name || user.email;
          topbarUser.appendChild(label);
        }
      } catch (e) { /* ignore */ }
    }

    // ── Trial / Subscription Check ───────────────────────────────────────
    // Pages that remain accessible even when the trial has expired
    const trialExemptPages = ['/dashboard', '/pricing', '/settings'];

    const token = localStorage.getItem('token');
    if (token && !publicPages.includes(currentPath)) {
      try {
        // Fetch features + trial status + settings (suspension) in parallel
        const [featRes, trialRes, settingsRes] = await Promise.all([
          fetch('/api/subscription/features', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/subscription/usage',    { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/settings',              { headers: { 'Authorization': `Bearer ${token}` } }),
        ]);

        // ── Suspension check ──
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          if (settingsData.suspension && settingsData.suspension.suspended) {
            document.body.setAttribute('data-suspended', 'true');
          }
        }

        // ── Feature gating ──
        if (featRes.ok) {
          const data = await featRes.json();
          const features = data.features || [];
          localStorage.setItem('userFeatures', JSON.stringify(features));

          document.querySelectorAll('.sidebar-nav .nav-item[data-feature]').forEach(link => {
            const requiredFeature = link.getAttribute('data-feature');
            if (!features.includes(requiredFeature)) {
              link.style.display = 'none';
            }
          });

          document.querySelectorAll('[data-feature]').forEach(el => {
            if (el.classList.contains('nav-item')) return;
            const requiredFeature = el.getAttribute('data-feature');
            if (!features.includes(requiredFeature)) {
              el.style.display = 'none';
            }
          });

          const requiredFeature = PAGE_FEATURE_MAP[currentPath];
          if (requiredFeature && !features.includes(requiredFeature)) {
            window.location.href = '/dashboard';
            return;
          }
        }

        // ── Trial expiry freeze ──
        if (trialRes.ok) {
          const usage = (await trialRes.json()).usage || {};
          if (usage.needsPayment) {
            // If user is on a non-exempt page, redirect to dashboard
            if (!trialExemptPages.includes(currentPath)) {
              window.location.href = '/dashboard';
              return;
            }
            // Show freeze overlay on exempt pages (dashboard shows banner natively)
            if (currentPath !== '/dashboard') {
              showTrialExpiredOverlay();
            }
          }
        }
      } catch (e) {
        console.warn('Could not load plan features:', e);
      }
    }

    // Initialize Lucide icons
    if (window.lucide) {
      lucide.createIcons();
    }
  });

  function showTrialExpiredOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'trial-expired-overlay';
    overlay.innerHTML = `
      <div class="trial-expired-card">
        <div class="trial-expired-icon">&#9940;</div>
        <h2>Your Free Trial Has Ended</h2>
        <p>Subscribe to a plan to continue using all features on the platform.</p>
        <div id="trialExpiredPlans" style="margin:16px 0;text-align:center;color:#666;">Loading plans...</div>
        <div class="trial-expired-actions">
          <a href="/pricing" class="btn btn-outline">View All Plans</a>
          <a href="/dashboard" class="btn btn-outline">Back to Dashboard</a>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    loadTrialExpiredPlans();
  }

  async function loadTrialExpiredPlans() {
    const container = document.getElementById('trialExpiredPlans');
    if (!container) return;
    try {
      const res = await fetch('/api/subscription/plans');
      const data = await res.json();
      const plans = (data.plans || []).filter(p => p.price > 0);
      if (!plans.length) { container.innerHTML = ''; return; }

      const COLORS = { starter: '#3b82f6', business: '#128C7E', pro: '#7c3aed' };
      container.innerHTML = plans.map(p => {
        const color = COLORS[p.planKey] || '#128C7E';
        return `<button data-overlay-plan="${p.planKey}" style="display:block;width:100%;margin-bottom:8px;padding:12px 16px;background:${color};color:#fff;border:none;border-radius:8px;font-size:0.95rem;font-weight:600;cursor:pointer;">
          ${p.name} – R${p.price}/mo
        </button>`;
      }).join('');

      container.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-overlay-plan]');
        if (btn) handleOverlayPay(btn.dataset.overlayPlan, btn);
      });
    } catch (e) {
      container.innerHTML = '';
    }
  }

  async function handleOverlayPay(planKey, btn) {
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = '/login'; return; }
    const original = btn.textContent;
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
        alert(data.message || 'Failed to initiate payment. Please try again.');
        btn.textContent = original;
        btn.disabled = false;
      }
    } catch (err) {
      alert('Something went wrong. Please try again.');
      btn.textContent = original;
      btn.disabled = false;
    }
  }
})();
