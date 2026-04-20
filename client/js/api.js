// API Client — wraps fetch with auth headers and error handling
const api = {
  getToken() {
    return localStorage.getItem('token');
  },

  async request(url, options = {}) {
    const token = this.getToken();
    const headers = { ...(options.headers || {}) };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Only set Content-Type for JSON (not for FormData)
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, { ...options, headers });

    if (res.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      throw new Error('Session expired');
    }

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || data.message || 'Request failed');
    }

    return data;
  },

  get(url) {
    return this.request(url);
  },

  post(url, body) {
    return this.request(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  put(url, body) {
    return this.request(url, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  patch(url, body) {
    return this.request(url, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  delete(url) {
    return this.request(url, { method: 'DELETE' });
  },

  // For file uploads (FormData)
  upload(url, formData, method = 'POST') {
    return this.request(url, {
      method,
      body: formData,
    });
  },
};
