import axios from 'axios';

/**
 * Resolves the primary API Base URL from Vite environment variables.
 * In production, warns clearly if VITE_API_URL is omitted.
 */
export function getApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  if (import.meta.env.PROD) {
    console.error(
      '⚠️ CRITICAL: VITE_API_URL is not configured in production environment variables! ' +
      'API requests may fail. Please configure VITE_API_URL in your hosting platform (e.g. https://luminalearn.edu.lk/api).'
    );
  }

  return 'http://localhost:5000/api';
}

/**
 * Resolves the backend base URL (without /api suffix) for static assets.
 */
export function getBackendBaseUrl() {
  const apiBase = getApiBaseUrl();
  return apiBase.replace(/\/api\/?$/, '');
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
});

// Automatically add token to authorization header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
