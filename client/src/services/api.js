import axios from 'axios';

const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_BASE_URL = rawUrl.replace(/\/+$/, '');

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('thecarepal_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle auth expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Optional: Clear token if session expired
      // localStorage.removeItem('thecarepal_token');
    }
    return Promise.reject(error);
  }
);

export default api;
