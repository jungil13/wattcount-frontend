// Use environment variable if set, otherwise use relative path for production
// or localhost for development
// This function runs at runtime to properly detect the environment
const getApiBaseUrl = () => {
  // Check environment variable first (highest priority)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Runtime check: if we're on Vercel or any production domain, use relative path
  // This ensures it works even if the build was done in dev mode
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isProduction = hostname.includes('vercel.app') || 
                       hostname.includes('.netlify.app') || 
                       hostname.includes('.github.io') ||
                       (!hostname.includes('localhost') && !hostname.includes('127.0.0.1'));
  
  if (isProduction) {
    console.log('[API] Using relative path /api for production');
    return '/api';
  }
  
  // Development: use localhost
  console.log('[API] Using localhost:3000/api for development');
  return 'http://localhost:3000/api';
};

// Get API base URL at runtime
const API_BASE_URL = getApiBaseUrl();
console.log('[API] Base URL:', API_BASE_URL);

// Helper function to get auth token
const getToken = () => {
  return localStorage.getItem('token');
};

// Helper function to get headers
const getHeaders = (includeAuth = true) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (includeAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  return headers;
};

// Generic fetch wrapper
const apiRequest = async (endpoint, options = {}) => {
  // Recalculate API base URL at runtime to ensure it's correct
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  
  // Safety check: prevent localhost in production
  if (typeof window !== 'undefined') {
    const isProduction = window.location.hostname.includes('vercel.app') || 
                         window.location.hostname.includes('.netlify.app');
    if (isProduction && url.includes('localhost')) {
      console.error('[API] ERROR: Attempted to use localhost in production!', url);
      throw new Error('Cannot use localhost API in production. Please set VITE_API_URL environment variable.');
    }
  }
  
  const config = {
    ...options,
    headers: {
      ...getHeaders(options.includeAuth !== false),
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    
    // Check if response has content before trying to parse JSON
    const contentType = response.headers.get('content-type');
    const text = await response.text();
    
    // If response is empty, throw a meaningful error
    if (!text || text.trim() === '') {
      throw new Error(`Empty response from server (${response.status} ${response.statusText})`);
    }
    
    // Try to parse as JSON if content-type indicates JSON, or if text looks like JSON
    let data;
    if (contentType && contentType.includes('application/json')) {
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
      }
    } else {
      // If not JSON, create an error object from the text
      throw new Error(text || `Server error: ${response.status} ${response.statusText}`);
    }

    if (!response.ok) {
      throw new Error(data.error || data.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return data;
  } catch (error) {
    // Re-throw with more context
    if (error.message) {
      throw error;
    }
    throw new Error(`Network error: ${error.message || 'Unknown error'}`);
  }
};

// Auth API
export const authAPI = {
  register: (userData) => apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
    includeAuth: false,
  }),
  
  login: (credentials) => apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
    includeAuth: false,
  }),
  
  connectWithCode: (data) => apiRequest('/auth/connect', {
    method: 'POST',
    body: JSON.stringify(data),
    includeAuth: false,
  }),
  
  generateSharedCode: () => apiRequest('/auth/generate-code', {
    method: 'POST',
  }),
  
  getSharedCodes: () => apiRequest('/auth/shared-codes'),
  deleteSharedCode: (code) => apiRequest(`/auth/shared-codes/${code}`, {
    method: 'DELETE',
  }),
  
  getProfile: () => apiRequest('/auth/profile'),
};

// User API
export const userAPI = {
  getAllSharedUsers: () => apiRequest('/users/shared'),
  getUserById: (id) => apiRequest(`/users/${id}`),
  updateUser: (id, data) => apiRequest(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deactivateUser: (id) => apiRequest(`/users/${id}`, {
    method: 'DELETE',
  }),
};

// Consumption API
export const consumptionAPI = {
  create: (data) => apiRequest('/consumption', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getMy: (limit, userId = null) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit);
    if (userId) params.append('user_id', userId);
    return apiRequest(`/consumption/my${params.toString() ? `?${params.toString()}` : ''}`);
  },
  getAll: () => apiRequest('/consumption/all'),
  getById: (id) => apiRequest(`/consumption/${id}`),
  update: (id, data) => apiRequest(`/consumption/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiRequest(`/consumption/${id}`, {
    method: 'DELETE',
  }),
  getSummary: (userId, startDate, endDate) => 
    apiRequest(`/consumption/summary?user_id=${userId}&startDate=${startDate}&endDate=${endDate}`),
};

// Bill API
export const billAPI = {
  create: (data) => apiRequest('/bills', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getMy: (limit) => apiRequest(`/bills/my${limit ? `?limit=${limit}` : ''}`),
  getAll: () => apiRequest('/bills/all'),
  getById: (id) => apiRequest(`/bills/${id}`),
  update: (id, data) => apiRequest(`/bills/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiRequest(`/bills/${id}`, {
    method: 'DELETE',
  }),
  getByCycle: (cycle) => apiRequest(`/bills/cycle?billing_cycle=${cycle}`),
};

// Payment API
export const paymentAPI = {
  create: (data) => apiRequest('/payments', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getMy: () => apiRequest('/payments/my'),
  getByBill: (billId) => apiRequest(`/payments/bill/${billId}`),
  getById: (id) => apiRequest(`/payments/${id}`),
};

// Rate API
export const rateAPI = {
  set: (data) => apiRequest('/rates', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getCurrent: () => apiRequest('/rates/current'),
  getAll: () => apiRequest('/rates/all'),
};

// Dev API (Development only)
export const devAPI = {
  autoLogin: (username) => apiRequest('/dev/auto-login', {
    method: 'POST',
    body: JSON.stringify({ username }),
    includeAuth: false,
  }),
  getTestUsers: () => apiRequest('/dev/test-users', {
    includeAuth: false,
  }),
};
