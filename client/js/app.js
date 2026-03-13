// App — auth guard, sidebar toggle, logout, user display
(function () {
  const publicPages = ['/login', '/register'];
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
  if (publicPages.includes(currentPath)) {
    const token = localStorage.getItem('token');
    if (token) {
      window.location.href = '/dashboard';
      return;
    }
  }

  // Wait for DOM
  document.addEventListener('DOMContentLoaded', () => {
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
        window.location.href = '/login';
      });
    }

    // Show user name in topbar
    const topbarUser = document.getElementById('topbarUser');
    if (topbarUser) {
      try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
          topbarUser.textContent = user.businessName || user.name || user.email;
        }
      } catch (e) { /* ignore */ }
    }

    // Initialize Lucide icons
    if (window.lucide) {
      lucide.createIcons();
    }
  });
})();
