document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.textContent = 'Signing in...';

  try {
    const data = await api.post('/api/auth/login', {
      email: document.getElementById('email').value,
      password: document.getElementById('password').value,
    });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    showToast('Signed in successfully!', 'success');

    // Redirect unverified users to verification page
    if (data.user && data.user.isVerified === false) {
      setTimeout(() => { window.location.href = '/verify'; }, 1200);
    } else {
      setTimeout(() => { window.location.href = '/dashboard'; }, 800);
    }
  } catch (err) {
    showToast(err.message || 'Invalid email or password. Please try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
});
