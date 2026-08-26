import axios, { AxiosError } from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Bearer token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global response error handling:
// - 401 → clear token + redirect to login
// - 500 → show toast (dispatched as custom event for UI to handle)
// - 422 → field-level errors are left for individual components to display
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;

    if (status === 401) {
      localStorage.removeItem('token');
      const path = window.location.pathname;
      // Only redirect if not already on auth/public pages
      const isPublicPage =
        path.startsWith('/login') ||
        path.startsWith('/register') ||
        path.startsWith('/products');
      if (!isPublicPage) {
        window.location.href = '/login';
      }
    }

    if (status === 500) {
      // Dispatch a custom event — UI layer can listen and display a toast
      window.dispatchEvent(
        new CustomEvent('api:server-error', {
          detail: { message: 'Something went wrong on the server. Please try again.' },
        })
      );
    }

    return Promise.reject(error);
  }
);

export default api;
