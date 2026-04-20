// Pre-select plan from URL ?plan=xxx
(function () {
  const params = new URLSearchParams(window.location.search);
  const planParam = params.get('plan');
  if (planParam) {
    const radio = document.querySelector('input[name="plan"][value="' + CSS.escape(planParam) + '"]');
    if (radio) radio.checked = true;
  }
  // Highlight selected card
  document.querySelectorAll('.plan-select-card').forEach(function (card) {
    const radio = card.querySelector('input[type="radio"]');
    if (radio && radio.checked) card.classList.add('selected');
    if (radio) {
      radio.addEventListener('change', function () {
        document.querySelectorAll('.plan-select-card').forEach(function (c) { c.classList.remove('selected'); });
        card.classList.add('selected');
      });
    }
  });
})();

document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('registerBtn');
  btn.disabled = true;
  btn.textContent = 'Creating account...';

  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (password !== confirmPassword) {
    showToast('Passwords do not match', 'error');
    btn.disabled = false;
    btn.textContent = 'Create Account';
    return;
  }

  if (password.length < 8) {
    showToast('Password must be at least 8 characters', 'error');
    btn.disabled = false;
    btn.textContent = 'Create Account';
    return;
  }

  try {
    const data = await api.post('/api/auth/register', {
      businessName: document.getElementById('businessName').value,
      name: document.getElementById('businessName').value,
      email: document.getElementById('email').value,
      phone: document.getElementById('phone').value,
      password: password,
      confirmPassword: confirmPassword,
      plan: document.querySelector('input[name="plan"]:checked')?.value || 'starter',
    });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    showToast('Account created successfully!', 'success');

    if (data.requiresVerification) {
      setTimeout(function () { window.location.href = '/verify'; }, 1200);
    } else {
      setTimeout(function () { window.location.href = '/dashboard'; }, 1200);
    }
  } catch (err) {
    showToast(err.message || 'Registration failed', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
});
