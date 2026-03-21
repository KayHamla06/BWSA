// Redirect if already authenticated as admin
(function () {
  const token = localStorage.getItem('adminToken');
  if (token) {
    window.location.href = '/admin/dashboard';
  }
})();

document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('adminLoginBtn');
  btn.disabled = true;
  btn.textContent = 'Signing in...';

  try {
    const res = await fetch('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');

    localStorage.setItem('adminToken', data.token);
    localStorage.setItem('adminUser', JSON.stringify(data.admin));
    showToast('Welcome, Admin!', 'success');
    setTimeout(() => { window.location.href = '/admin/dashboard'; }, 800);
  } catch (err) {
    showToast(err.message || 'Invalid credentials', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In to Admin';
  }
});
