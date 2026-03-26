import axios, { AxiosError } from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Request interceptor — attach access token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — refresh token on 401
let refreshing = false;
let queue: Array<(token: string) => void> = [];

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (typeof error.config) & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry && original) {
      if (refreshing) {
        return new Promise((resolve) => {
          queue.push((token) => {
            original.headers!['Authorization'] = `Bearer ${token}`;
            resolve(apiClient(original));
          });
        });
      }

      original._retry = true;
      refreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
        const newToken = data.data.accessToken;
        const newRefresh = data.data.refreshToken;

        localStorage.setItem('accessToken', newToken);
        localStorage.setItem('refreshToken', newRefresh);

        queue.forEach((cb) => cb(newToken));
        queue = [];

        original.headers!['Authorization'] = `Bearer ${newToken}`;
        return apiClient(original);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(error);
      } finally {
        refreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
