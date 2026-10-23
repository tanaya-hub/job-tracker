const API_URL = '/api';

function getToken() {
  return localStorage.getItem('token');
}

function getUser() {
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

function saveSession(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

async function apiRequest(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(API_URL + path, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const isLogin = path.startsWith('/auth/login');
    if (response.status === 401 && token && !isLogin) {
      clearSession();
      window.location.href = '/index.html';
    }
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
}

function showMessage(element, text, type) {
  element.textContent = text;
  element.className = `message ${type}`;
}