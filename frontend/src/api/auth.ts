import apiClient from './client';
import { User } from '../types';

interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}

export const authApi = {
  register: async (data: { name: string; email: string; password: string }) => {
    const res = await apiClient.post<AuthResponse>('/auth/register', data);
    return res.data.data;
  },

  login: async (data: { email: string; password: string }) => {
    const res = await apiClient.post<AuthResponse>('/auth/login', data);
    return res.data.data;
  },

  googleAuth: async (credential: string) => {
    const res = await apiClient.post<AuthResponse>('/auth/google', { credential });
    return res.data.data;
  },

  getMe: async () => {
    const res = await apiClient.get<{ success: boolean; data: { user: User } }>('/auth/me');
    return res.data.data.user;
  },

  logout: async (refreshToken: string) => {
    await apiClient.post('/auth/logout', { refreshToken });
  },

  forgotPassword: async (email: string) => {
    const res = await apiClient.post('/auth/forgot-password', { email });
    return res.data;
  },

  resetPassword: async (token: string, password: string) => {
    const res = await apiClient.post('/auth/reset-password', { token, password });
    return res.data;
  },
};
