const API_BASE = '/api'

// Get stored JWT token
function getToken() {
  return localStorage.getItem('immosuite_token')
}

// Save JWT token
export function setToken(token) {
  localStorage.setItem('immosuite_token', token)
}

// Remove JWT token
export function clearToken() {
  localStorage.removeItem('immosuite_token')
}

// Check if user is authenticated
export function isAuthenticated() {
  return !!getToken()
}

// Generic fetch wrapper
async function request(endpoint, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })

  if (res.status === 401) {
    clearToken()
    window.location.href = '/login'
    throw new Error('Session expirée')
  }

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erreur serveur')
  return data
}

// ==================== AUTH ====================
export const auth = {
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (data) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request('/auth/me'),
}

// ==================== PROPERTIES ====================
export const properties = {
  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request(`/properties${q ? `?${q}` : ''}`)
  },
  getById: (id) => request(`/properties/${id}`),
  create: (data) =>
    request('/properties', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) =>
    request(`/properties/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) =>
    request(`/properties/${id}`, { method: 'DELETE' }),
}

// ==================== TENANTS ====================
export const tenants = {
  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request(`/tenants${q ? `?${q}` : ''}`)
  },
  getById: (id) => request(`/tenants/${id}`),
  create: (data) =>
    request('/tenants', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) =>
    request(`/tenants/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) =>
    request(`/tenants/${id}`, { method: 'DELETE' }),
  settle: (id, data = {}) =>
    request(`/tenants/${id}/settle`, { method: 'POST', body: JSON.stringify(data) }),
  generateMonthly: () =>
    request('/tenants/generate-monthly', { method: 'POST' }),
}

// ==================== PROSPECTS ====================
export const prospects = {
  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request(`/prospects${q ? `?${q}` : ''}`)
  },
  create: (data) =>
    request('/prospects', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) =>
    request(`/prospects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  advance: (id) =>
    request(`/prospects/${id}/advance`, { method: 'PUT' }),
  convert: (id) =>
    request(`/prospects/${id}/convert`, { method: 'POST' }),
  remove: (id) =>
    request(`/prospects/${id}`, { method: 'DELETE' }),
}

// ==================== PAYMENTS ====================
export const payments = {
  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request(`/payments${q ? `?${q}` : ''}`)
  },
  create: (data) =>
    request('/payments', { method: 'POST', body: JSON.stringify(data) }),
  getQuittance: (id) => request(`/payments/${id}/quittance`),
  generateQuittances: () =>
    request('/payments/generate-quittances', { method: 'POST' }),
  sendRelances: () =>
    request('/payments/send-relances', { method: 'POST' }),
  exportAll: () => request('/payments/export'),
  getRelancesHistory: () => request('/payments/relances-history'),
}

// ==================== CHARGES ====================
export const charges = {
  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request(`/charges${q ? `?${q}` : ''}`)
  },
  create: (data) =>
    request('/charges', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) =>
    request(`/charges/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  settle: (id) =>
    request(`/charges/${id}/settle`, { method: 'PUT' }),
  remove: (id) =>
    request(`/charges/${id}`, { method: 'DELETE' }),
}

// ==================== DASHBOARD ====================
export const dashboard = {
  get: () => request('/dashboard'),
  getRevenueChart: () => request('/dashboard/revenue-chart'),
}

// ==================== PORTAL (public) ====================
export const portal = {
  getData: (token) =>
    fetch(`${API_BASE}/portal/${token}`).then(r => r.json()),
  pay: (token, data) =>
    fetch(`${API_BASE}/portal/${token}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => r.json()),
}

// ==================== SETTINGS ====================
export const settings = {
  get: () => request('/settings'),
  update: (data) =>
    request('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  uploadLogo: (logoUrl) =>
    request('/settings/logo', { method: 'POST', body: JSON.stringify({ logoUrl }) }),
  reset: () =>
    request('/settings/reset', { method: 'POST' }),
}

// ==================== NOTIFICATIONS ====================
export const notifications = {
  getAll: () => request('/notifications'),
  markAsRead: (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllAsRead: () => request('/notifications/read-all', { method: 'PUT' }),
}
