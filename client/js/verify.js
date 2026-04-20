// Guard: must have token
const token = localStorage.getItem('token');
if (!token) { window.location.href = '/login'; }

const pinInput = document.getElementById('pin');
const msgBox = document.getElementById('verifyMsg');
const msgIcon = msgBox.querySelector('.error-icon');
const msgText = msgBox.querySelector('.error-text');

function showMsg(text, type) {
  // Reset
  msgBox.classList.remove('show', 'hide', 'verify-success');
  void msgBox.offsetWidth; // force reflow so animation replays

  msgIcon.innerHTML = type === 'success' ? '&#10003;' : '&#10007;';
  msgText.textContent = text;
  if (type === 'success') msgBox.classList.add('verify-success');
  msgBox.classList.add('show');
}

function hideMsg() {
  if (!msgBox.classList.contains('show')) return;
  msgBox.classList.add('hide');
  msgBox.addEventListener('animationend', function () {
    msgBox.classList.remove('show', 'hide', 'verify-success');
  }, { once: true });
}

function shakeInput() {
  pinInput.classList.add('pin-input-error', 'shake');
  pinInput.addEventListener('animationend', function () { pinInput.classList.remove('shake'); }, { once: true });
}

// Clear error styling when user starts typing
pinInput.addEventListener('input', function () {
  pinInput.classList.remove('pin-input-error');
  hideMsg();
});

document.getElementById('verifyForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('verifyBtn');
  const pin = pinInput.value.trim();

  if (pin.length !== 6) {
    showMsg('Please enter a valid 6-digit PIN.', 'error');
    shakeInput();
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Verifying...';

  try {
    const data = await api.post('/api/auth/verify-pin', { pin: pin });
    if (data.status === 'VERIFIED') {
      showMsg('Account verified successfully!', 'success');
      showToast('Account verified! Redirecting...', 'success');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      user.isVerified = true;
      localStorage.setItem('user', JSON.stringify(user));
      setTimeout(function () { window.location.href = '/dashboard'; }, 1500);
    }
  } catch (err) {
    const message = err.message || 'Verification failed. Please try again.';
    showMsg(message, 'error');
    shakeInput();
    showToast(message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Verify Account';
  }
});

document.getElementById('resendBtn').addEventListener('click', async function () {
  const btn = document.getElementById('resendBtn');
  btn.disabled = true;
  btn.textContent = 'Sending...';

  try {
    await api.post('/api/auth/resend-pin', {});
    showMsg('New PIN sent to your WhatsApp!', 'success');
    showToast('New PIN sent to your WhatsApp', 'success');
  } catch (err) {
    const message = err.message || 'Failed to resend PIN. Please try again.';
    showMsg(message, 'error');
    showToast(message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Resend PIN';
  }
});
