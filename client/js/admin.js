/**
 * Admin Dashboard JS
 * Handles auth guard, section navigation, data loading, modals.
 */
(function () {
  'use strict';

  // ── Auth Guard ──
  const token = localStorage.getItem('adminToken');
  if (!token) {
    window.location.href = '/admin/login';
    return;
  }

  // ── Admin API Helper ──
  const adminApi = {
    async request(url, options = {}) {
      const headers = { 'Content-Type': 'application/json', ...options.headers };
      const t = localStorage.getItem('adminToken');
      if (t) headers['Authorization'] = `Bearer ${t}`;

      const res = await fetch(url, { ...options, headers });
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        window.location.href = '/admin/login';
        throw new Error('Session expired');
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Request failed');
      return data;
    },
    get(url) { return this.request(url); },
    patch(url, body) {
      return this.request(url, { method: 'PATCH', body: JSON.stringify(body) });
    },
  };

  // ── Utility Functions ──
  function formatCurrency(amount) {
    return 'R' + Number(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function formatDateTime(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-ZA', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function truncId(id) {
    return id ? id.slice(-8) : '—';
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  // ── DOM Ready ──
  document.addEventListener('DOMContentLoaded', () => {
    // Show admin info in sidebar & topbar
    try {
      const admin = JSON.parse(localStorage.getItem('adminUser'));
      if (admin) {
        const profile = document.getElementById('adminProfile');
        if (profile) {
          profile.innerHTML = `<div class="admin-name">${escapeHtml(admin.name)}</div><div class="admin-role">${escapeHtml(admin.role)}</div>`;
        }
        const topbar = document.getElementById('topbarAdmin');
        if (topbar) topbar.textContent = admin.name || admin.email;
      }
    } catch (e) { /* ignore */ }

    // ── Sidebar Navigation ──
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    const sections = document.querySelectorAll('.admin-section');

    function showSection(sectionName) {
      sections.forEach((s) => s.classList.remove('active'));
      navItems.forEach((n) => n.classList.remove('active'));

      const target = document.getElementById('section-' + sectionName);
      if (target) target.classList.add('active');

      const navTarget = document.querySelector(`.nav-item[data-section="${sectionName}"]`);
      if (navTarget) navTarget.classList.add('active');

      // Load data for section
      if (sectionName === 'overview') loadOverview();
      if (sectionName === 'users') loadUsers();
      if (sectionName === 'customers') loadCustomers();
      if (sectionName === 'orders') loadOrders();
      if (sectionName === 'payments') loadPayments();
      if (sectionName === 'activity') loadActivity('activityFeedFull');
    }

    navItems.forEach((item) => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.dataset.section;
        if (section) showSection(section);
        // Close mobile sidebar
        document.getElementById('sidebar')?.classList.remove('open');
      });
    });

    // Sidebar toggle (mobile)
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sidebar = document.getElementById('sidebar');
    const sidebarClose = document.getElementById('sidebarClose');

    if (hamburgerBtn) hamburgerBtn.addEventListener('click', () => sidebar?.classList.add('open'));
    if (sidebarClose) sidebarClose.addEventListener('click', () => sidebar?.classList.remove('open'));

    // Logout
    document.getElementById('adminLogoutBtn')?.addEventListener('click', () => {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      window.location.href = '/admin/login';
    });

    // Modal close handlers
    document.getElementById('closeUserDetail')?.addEventListener('click', () => {
      document.getElementById('userDetailModal')?.classList.remove('active');
    });
    document.getElementById('closeCustomerDetail')?.addEventListener('click', () => {
      document.getElementById('customerDetailModal')?.classList.remove('active');
    });

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach((overlay) => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('active');
      });
    });

    // Search / Filter handlers
    let userSearchTimer;
    document.getElementById('userSearch')?.addEventListener('input', () => {
      clearTimeout(userSearchTimer);
      userSearchTimer = setTimeout(() => loadUsers(1), 400);
    });
    document.getElementById('userStatusFilter')?.addEventListener('change', () => loadUsers(1));

    let customerSearchTimer;
    document.getElementById('customerSearch')?.addEventListener('input', () => {
      clearTimeout(customerSearchTimer);
      customerSearchTimer = setTimeout(() => loadCustomers(1), 400);
    });

    document.getElementById('orderStatusFilter')?.addEventListener('change', () => loadOrders(1));
    document.getElementById('paymentStatusFilter')?.addEventListener('change', () => loadPayments(1));

    // ── Initialize Lucide icons ──
    if (window.lucide) lucide.createIcons();

    // ── Event delegation for dynamic action buttons ──
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (action === 'view-user' && id) window._adminViewUser(id);
      else if (action === 'toggle-user' && id) window._adminToggleUser(id, btn.dataset.status);
      else if (action === 'delete-user' && id) window._adminDeleteUser(id, btn.dataset.email);
      else if (action === 'view-customer' && id) window._adminViewCustomer(id);
    });

    // ── Load initial section ──
    showSection('overview');
  });

  // ═══════════ DATA LOADERS ═══════════

  async function loadOverview() {
    try {
      const data = await adminApi.get('/api/admin/dashboard/stats');
      const s = data.stats;

      setText('statTotalUsers', s.totalUsers);
      setText('statActiveUsers', s.activeUsers);
      setText('statSuspendedUsers', s.suspendedUsers);
      setText('statTotalCustomers', s.totalCustomers);
      setText('statTotalRevenue', formatCurrency(s.totalRevenue));
      setText('statRevenueToday', formatCurrency(s.revenueToday));
      setText('statRevenueMonth', formatCurrency(s.revenueMonth));
      setText('statTotalOrders', s.totalOrders);
      setText('statOrdersToday', s.ordersToday);
      setText('statCompletedPayments', s.completedPayments);
      setText('statFailedPayments', s.failedPayments);
      setText('statPendingWithdrawals', s.pendingWithdrawals);

      loadActivity('activityFeed');
    } catch (err) {
      showToast('Failed to load admin stats: ' + err.message, 'error');
    }
    refreshIcons();
  }

  async function loadActivity(containerId) {
    try {
      const data = await adminApi.get('/api/admin/dashboard/recent-activity');
      const container = document.getElementById(containerId);
      if (!container) return;

      if (!data.activity?.length) {
        container.innerHTML = '<p class="text-muted" style="text-align:center;padding:20px;">No recent activity</p>';
        return;
      }

      container.innerHTML = data.activity.map((a) => `
        <div class="activity-item">
          <div class="activity-dot ${a.type}"></div>
          <div class="activity-body">
            <div class="activity-desc">${escapeHtml(a.description)}</div>
            <div class="activity-meta">
              <span>${escapeHtml(a.seller)}</span>
              <span class="status-badge status-${a.status}">${escapeHtml(a.status)}</span>
              <span>${formatDateTime(a.date)}</span>
            </div>
          </div>
        </div>
      `).join('');
    } catch (err) {
      console.error('Activity load error:', err);
    }
  }

  // ── Users ──
  async function loadUsers(page = 1) {
    try {
      const search = document.getElementById('userSearch')?.value || '';
      const status = document.getElementById('userStatusFilter')?.value || '';
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.set('search', search);
      if (status) params.set('status', status);

      const data = await adminApi.get('/api/admin/dashboard/users?' + params);
      const tbody = document.getElementById('usersBody');
      if (!tbody) return;

      if (!data.users?.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No users found</td></tr>';
        renderPagination('usersPagination', 0, 0, () => {});
        return;
      }

      tbody.innerHTML = data.users.map((u) => `
        <tr>
          <td>${escapeHtml(u.name)}</td>
          <td>${escapeHtml(u.businessName)}</td>
          <td>${escapeHtml(u.email)}</td>
          <td><span class="status-badge status-active">${escapeHtml(u.subscription?.planKey || u.plan || 'free')}</span></td>
          <td><span class="status-badge status-${u.status}">${escapeHtml(u.status)}</span></td>
          <td>${formatDate(u.createdAt)}</td>
          <td class="action-cell">
            <button class="btn btn-sm btn-view" data-action="view-user" data-id="${u._id}">View</button>
            ${u.status === 'active'
              ? `<button class="btn btn-sm btn-suspend" data-action="toggle-user" data-id="${u._id}" data-status="suspended">Suspend</button>`
              : `<button class="btn btn-sm btn-activate" data-action="toggle-user" data-id="${u._id}" data-status="active">Activate</button>`
            }
            <button class="btn btn-sm btn-delete" data-action="delete-user" data-id="${u._id}" data-email="${escapeHtml(u.email)}">Delete</button>
          </td>
        </tr>
      `).join('');

      renderPagination('usersPagination', data.page, data.pages, loadUsers);
    } catch (err) {
      showToast('Failed to load users: ' + err.message, 'error');
    }
  }

  // ── User Detail Modal ──
  window._adminViewUser = async function (id) {
    const modal = document.getElementById('userDetailModal');
    const body = document.getElementById('userDetailBody');
    if (!modal || !body) return;

    modal.classList.add('active');
    body.innerHTML = '<p class="text-muted">Loading user data...</p>';

    try {
      const data = await adminApi.get('/api/admin/dashboard/users/' + encodeURIComponent(id));
      const u = data.user;
      const sub = data.subscription;
      const sum = data.summary;

      document.getElementById('userDetailTitle').textContent = u.businessName || u.name;

      body.innerHTML = `
        <div class="detail-grid">
          <div class="detail-item"><div class="detail-label">Name</div><div class="detail-value">${escapeHtml(u.name)}</div></div>
          <div class="detail-item"><div class="detail-label">Email</div><div class="detail-value">${escapeHtml(u.email)}</div></div>
          <div class="detail-item"><div class="detail-label">Business</div><div class="detail-value">${escapeHtml(u.businessName)}</div></div>
          <div class="detail-item"><div class="detail-label">WhatsApp</div><div class="detail-value">${escapeHtml(u.whatsappNumber)}</div></div>
          <div class="detail-item"><div class="detail-label">Plan</div><div class="detail-value">${escapeHtml(sub?.planKey || u.plan || 'free')}</div></div>
          <div class="detail-item"><div class="detail-label">Status</div><div class="detail-value"><span class="status-badge status-${u.status}">${escapeHtml(u.status)}</span></div></div>
          <div class="detail-item"><div class="detail-label">Verified</div><div class="detail-value">${u.isVerified ? '✅ Yes' : '❌ No'}</div></div>
          <div class="detail-item"><div class="detail-label">Joined</div><div class="detail-value">${formatDateTime(u.createdAt)}</div></div>
          <div class="detail-item"><div class="detail-label">Total Revenue</div><div class="detail-value">${formatCurrency(sum.totalRevenue)}</div></div>
          <div class="detail-item"><div class="detail-label">Total Orders</div><div class="detail-value">${sum.totalOrders}</div></div>
          <div class="detail-item"><div class="detail-label">Total Customers</div><div class="detail-value">${sum.totalCustomers}</div></div>
          <div class="detail-item"><div class="detail-label">Total Products</div><div class="detail-value">${sum.totalProducts}</div></div>
        </div>

        ${sub ? `
        <div class="detail-section">
          <h3>Subscription</h3>
          <div class="detail-grid">
            <div class="detail-item"><div class="detail-label">Plan</div><div class="detail-value">${escapeHtml(sub.planKey)}</div></div>
            <div class="detail-item"><div class="detail-label">Status</div><div class="detail-value">${escapeHtml(sub.status)}</div></div>
            <div class="detail-item"><div class="detail-label">Messages Used</div><div class="detail-value">${sub.messagesUsedThisPeriod || 0}</div></div>
            <div class="detail-item"><div class="detail-label">Next Billing</div><div class="detail-value">${formatDate(sub.nextBillingDate)}</div></div>
          </div>
        </div>` : ''}

        ${u.payoutInfo?.bankName ? `
        <div class="detail-section">
          <h3>Payout Info</h3>
          <div class="detail-grid">
            <div class="detail-item"><div class="detail-label">Bank</div><div class="detail-value">${escapeHtml(u.payoutInfo.bankName)}</div></div>
            <div class="detail-item"><div class="detail-label">Account Holder</div><div class="detail-value">${escapeHtml(u.payoutInfo.accountHolder)}</div></div>
            <div class="detail-item"><div class="detail-label">Account Number</div><div class="detail-value">${escapeHtml(u.payoutInfo.accountNumber)}</div></div>
            <div class="detail-item"><div class="detail-label">Account Type</div><div class="detail-value">${escapeHtml(u.payoutInfo.accountType)}</div></div>
          </div>
        </div>` : ''}

        <div class="detail-section">
          <h3>Products (${data.products?.length || 0})</h3>
          ${data.products?.length ? `
          <div class="table-container">
            <table class="data-table">
              <thead><tr><th>Name</th><th>Price</th><th>Stock</th><th>Sold</th><th>Revenue</th><th>Active</th></tr></thead>
              <tbody>
                ${data.products.map((p) => `
                  <tr>
                    <td>${escapeHtml(p.name)}</td>
                    <td>${formatCurrency(p.price)}</td>
                    <td>${p.stock}</td>
                    <td>${p.soldCount}</td>
                    <td>${formatCurrency(p.revenue)}</td>
                    <td>${p.isActive ? '✅' : '❌'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>` : '<p class="text-muted">No products</p>'}
        </div>

        <div class="detail-section">
          <h3>Customers (${data.customers?.length || 0})</h3>
          ${data.customers?.length ? `
          <div class="table-container">
            <table class="data-table">
              <thead><tr><th>Name</th><th>WhatsApp</th><th>Email</th><th>Orders</th><th>Total Spent</th><th>Last Order</th></tr></thead>
              <tbody>
                ${data.customers.map((c) => `
                  <tr>
                    <td>${escapeHtml(c.name)}</td>
                    <td>${escapeHtml(c.whatsappNumber)}</td>
                    <td>${escapeHtml(c.email || '—')}</td>
                    <td>${c.totalOrders || c.orderCount || 0}</td>
                    <td>${formatCurrency(c.totalSpent)}</td>
                    <td>${formatDate(c.lastOrderDate)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>` : '<p class="text-muted">No customers</p>'}
        </div>

        <div class="detail-section">
          <h3>Recent Orders (${data.orders?.length || 0})</h3>
          ${data.orders?.length ? `
          <div class="table-container">
            <table class="data-table">
              <thead><tr><th>ID</th><th>Product</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                ${data.orders.slice(0, 20).map((o) => `
                  <tr>
                    <td>${truncId(o._id)}</td>
                    <td>${escapeHtml(o.productSnapshot?.name || '—')}</td>
                    <td>${formatCurrency(o.amount)}</td>
                    <td><span class="status-badge status-${o.status}">${escapeHtml(o.status)}</span></td>
                    <td>${formatDate(o.createdAt)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>` : '<p class="text-muted">No orders</p>'}
        </div>

        <div class="detail-section">
          <h3>Recent Payments (${data.payments?.length || 0})</h3>
          ${data.payments?.length ? `
          <div class="table-container">
            <table class="data-table">
              <thead><tr><th>Transaction</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                ${data.payments.slice(0, 20).map((p) => `
                  <tr>
                    <td>${escapeHtml(p.transactionId || truncId(p._id))}</td>
                    <td>${formatCurrency(p.amount)}</td>
                    <td>${escapeHtml(p.paymentMethod)}</td>
                    <td><span class="status-badge status-${p.status}">${escapeHtml(p.status)}</span></td>
                    <td>${formatDate(p.createdAt)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>` : '<p class="text-muted">No payments</p>'}
        </div>

        ${data.withdrawals?.length ? `
        <div class="detail-section">
          <h3>Withdrawal Requests (${data.withdrawals.length})</h3>
          <div class="table-container">
            <table class="data-table">
              <thead><tr><th>Amount</th><th>Method</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                ${data.withdrawals.map((w) => `
                  <tr>
                    <td>${formatCurrency(w.amount)}</td>
                    <td>${escapeHtml(w.payoutMethod)}</td>
                    <td><span class="status-badge status-${w.status}">${escapeHtml(w.status)}</span></td>
                    <td>${formatDate(w.requestedAt)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>` : ''}

        <div class="detail-section delete-account-section">
          <h3>Danger Zone</h3>
          <div class="danger-zone-box">
            <div class="danger-zone-info">
              <strong>Delete this account</strong>
              <p>Permanently remove this seller account and all associated data (customers, orders, payments, products). This action cannot be undone.</p>
            </div>
            <button class="btn btn-sm btn-delete btn-delete-lg" data-action="delete-user" data-id="${u._id}" data-email="${escapeHtml(u.email)}">Delete Account</button>
          </div>
        </div>
      `;
    } catch (err) {
      body.innerHTML = `<p class="text-muted">Error loading user: ${escapeHtml(err.message)}</p>`;
    }
  };

  // ── Delete User Account ──
  window._adminDeleteUser = async function (id, email) {
    const confirmText = prompt(`This will PERMANENTLY delete the account for ${email} and ALL their data (customers, orders, payments, products).\n\nType the email address to confirm:`);
    if (confirmText !== email) {
      if (confirmText !== null) showToast('Email did not match. Deletion cancelled.', 'warning');
      return;
    }
    try {
      await adminApi.request('/api/admin/dashboard/users/' + encodeURIComponent(id), { method: 'DELETE' });
      showToast('Account and all data permanently deleted.', 'success');
      document.getElementById('userDetailModal')?.classList.remove('active');
      loadUsers();
      loadOverview();
    } catch (err) {
      showToast('Delete failed: ' + err.message, 'error');
    }
  };

  // ── Toggle User Status ──
  window._adminToggleUser = async function (id, newStatus) {
    let reason = '';
    if (newStatus === 'suspended') {
      reason = prompt('Enter the reason for suspending this user:');
      if (reason === null) return; // cancelled
      reason = reason.trim();
      if (!reason) {
        showToast('You must provide a reason for suspension.', 'warning');
        return;
      }
    } else {
      if (!confirm('Are you sure you want to activate this user?')) return;
    }
    try {
      const body = { status: newStatus };
      if (newStatus === 'suspended') body.reason = reason;
      await adminApi.patch('/api/admin/dashboard/users/' + encodeURIComponent(id) + '/status', body);
      showToast(`User ${newStatus === 'suspended' ? 'suspended' : 'activated'} successfully`, 'success');
      loadUsers();
    } catch (err) {
      showToast('Failed: ' + err.message, 'error');
    }
  };

  // ── Customers ──
  async function loadCustomers(page = 1) {
    try {
      const search = document.getElementById('customerSearch')?.value || '';
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.set('search', search);

      const data = await adminApi.get('/api/admin/dashboard/customers?' + params);
      const tbody = document.getElementById('customersBody');
      if (!tbody) return;

      if (!data.customers?.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No customers found</td></tr>';
        renderPagination('customersPagination', 0, 0, () => {});
        return;
      }

      tbody.innerHTML = data.customers.map((c) => `
        <tr style="cursor:pointer" data-action="view-customer" data-id="${c._id}">
          <td>${escapeHtml(c.name)}</td>
          <td>${escapeHtml(c.whatsappNumber)}</td>
          <td>${escapeHtml(c.email || '—')}</td>
          <td>${escapeHtml(c.userId?.businessName || c.userId?.name || '—')}</td>
          <td>${c.totalOrders || c.orderCount || 0}</td>
          <td>${formatCurrency(c.totalSpent)}</td>
          <td>${formatDate(c.lastOrderDate)}</td>
        </tr>
      `).join('');

      renderPagination('customersPagination', data.page, data.pages, loadCustomers);
    } catch (err) {
      showToast('Failed to load customers: ' + err.message, 'error');
    }
  }

  // ── Customer Detail Modal ──
  window._adminViewCustomer = async function (id) {
    const modal = document.getElementById('customerDetailModal');
    const body = document.getElementById('customerDetailBody');
    if (!modal || !body) return;

    modal.classList.add('active');
    body.innerHTML = '<p class="text-muted">Loading customer data...</p>';

    try {
      const data = await adminApi.get('/api/admin/dashboard/customers/' + encodeURIComponent(id));
      const c = data.customer;

      document.getElementById('customerDetailTitle').textContent = c.name;

      const totalSpent = data.payments?.filter((p) => p.status === 'completed').reduce((s, p) => s + p.amount, 0) || c.totalSpent || 0;

      body.innerHTML = `
        <div class="detail-grid">
          <div class="detail-item"><div class="detail-label">Name</div><div class="detail-value">${escapeHtml(c.name)}</div></div>
          <div class="detail-item"><div class="detail-label">WhatsApp</div><div class="detail-value">${escapeHtml(c.whatsappNumber)}</div></div>
          <div class="detail-item"><div class="detail-label">Email</div><div class="detail-value">${escapeHtml(c.email || '—')}</div></div>
          <div class="detail-item"><div class="detail-label">Phone</div><div class="detail-value">${escapeHtml(c.phoneNumber || '—')}</div></div>
          <div class="detail-item"><div class="detail-label">Seller</div><div class="detail-value">${escapeHtml(c.userId?.businessName || c.userId?.name || '—')}</div></div>
          <div class="detail-item"><div class="detail-label">Total Orders</div><div class="detail-value">${c.totalOrders || c.orderCount || 0}</div></div>
          <div class="detail-item"><div class="detail-label">Total Spent</div><div class="detail-value">${formatCurrency(totalSpent)}</div></div>
          <div class="detail-item"><div class="detail-label">Last Order</div><div class="detail-value">${formatDate(c.lastOrderDate)}</div></div>
          <div class="detail-item"><div class="detail-label">First Contact</div><div class="detail-value">${formatDateTime(c.createdAt)}</div></div>
        </div>

        <div class="detail-section">
          <h3>Orders (${data.orders?.length || 0})</h3>
          ${data.orders?.length ? `
          <div class="table-container">
            <table class="data-table">
              <thead><tr><th>ID</th><th>Product</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                ${data.orders.map((o) => `
                  <tr>
                    <td>${truncId(o._id)}</td>
                    <td>${escapeHtml(o.productSnapshot?.name || '—')}</td>
                    <td>${formatCurrency(o.amount)}</td>
                    <td><span class="status-badge status-${o.status}">${escapeHtml(o.status)}</span></td>
                    <td>${formatDate(o.createdAt)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>` : '<p class="text-muted">No orders for this customer</p>'}
        </div>

        <div class="detail-section">
          <h3>Payments (${data.payments?.length || 0})</h3>
          ${data.payments?.length ? `
          <div class="table-container">
            <table class="data-table">
              <thead><tr><th>Transaction</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                ${data.payments.map((p) => `
                  <tr>
                    <td>${escapeHtml(p.transactionId || truncId(p._id))}</td>
                    <td>${formatCurrency(p.amount)}</td>
                    <td>${escapeHtml(p.paymentMethod)}</td>
                    <td><span class="status-badge status-${p.status}">${escapeHtml(p.status)}</span></td>
                    <td>${formatDate(p.createdAt)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>` : '<p class="text-muted">No payments for this customer</p>'}
        </div>
      `;
    } catch (err) {
      body.innerHTML = `<p class="text-muted">Error: ${escapeHtml(err.message)}</p>`;
    }
  };

  // ── Orders ──
  async function loadOrders(page = 1) {
    try {
      const status = document.getElementById('orderStatusFilter')?.value || '';
      const params = new URLSearchParams({ page, limit: 20 });
      if (status) params.set('status', status);

      const data = await adminApi.get('/api/admin/dashboard/orders?' + params);
      const tbody = document.getElementById('ordersBody');
      if (!tbody) return;

      if (!data.orders?.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No orders found</td></tr>';
        renderPagination('ordersPagination', 0, 0, () => {});
        return;
      }

      tbody.innerHTML = data.orders.map((o) => `
        <tr>
          <td>${truncId(o._id)}</td>
          <td>${escapeHtml(o.userId?.businessName || o.userId?.name || '—')}</td>
          <td>${escapeHtml(o.customerId?.name || o.customerPhone || '—')}</td>
          <td>${escapeHtml(o.productSnapshot?.name || '—')}</td>
          <td>${formatCurrency(o.amount)}</td>
          <td><span class="status-badge status-${o.status}">${escapeHtml(o.status)}</span></td>
          <td>${formatDate(o.createdAt)}</td>
        </tr>
      `).join('');

      renderPagination('ordersPagination', data.page, data.pages, loadOrders);
    } catch (err) {
      showToast('Failed to load orders: ' + err.message, 'error');
    }
  }

  // ── Payments ──
  async function loadPayments(page = 1) {
    try {
      const status = document.getElementById('paymentStatusFilter')?.value || '';
      const params = new URLSearchParams({ page, limit: 20 });
      if (status) params.set('status', status);

      const data = await adminApi.get('/api/admin/dashboard/payments?' + params);
      const tbody = document.getElementById('paymentsBody');
      if (!tbody) return;

      if (!data.payments?.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No payments found</td></tr>';
        renderPagination('paymentsPagination', 0, 0, () => {});
        return;
      }

      tbody.innerHTML = data.payments.map((p) => `
        <tr>
          <td>${escapeHtml(p.transactionId || truncId(p._id))}</td>
          <td>${escapeHtml(p.userId?.businessName || p.userId?.name || '—')}</td>
          <td>${formatCurrency(p.amount)}</td>
          <td>${escapeHtml(p.paymentMethod)}</td>
          <td>${escapeHtml(p.paymentFlow)}</td>
          <td><span class="status-badge status-${p.status}">${escapeHtml(p.status)}</span></td>
          <td>${formatDate(p.createdAt)}</td>
        </tr>
      `).join('');

      renderPagination('paymentsPagination', data.page, data.pages, loadPayments);
    } catch (err) {
      showToast('Failed to load payments: ' + err.message, 'error');
    }
  }

  // ═══════════ HELPERS ═══════════

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function renderPagination(containerId, currentPage, totalPages, loadFn) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    let html = `<button ${currentPage <= 1 ? 'disabled' : ''} data-page="${currentPage - 1}">&laquo; Prev</button>`;
    html += `<span class="page-info">Page ${currentPage} of ${totalPages}</span>`;
    html += `<button ${currentPage >= totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">Next &raquo;</button>`;

    container.innerHTML = html;
    container.querySelectorAll('button:not([disabled])').forEach((btn) => {
      btn.addEventListener('click', () => loadFn(parseInt(btn.dataset.page)));
    });
  }

  function refreshIcons() {
    if (window.lucide) lucide.createIcons();
  }
})();
