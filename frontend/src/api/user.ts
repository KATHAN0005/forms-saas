// User API - profile, password, stats
import apiClient from './client';
import { User } from '../types';

export const userApi = {
  updateProfile: async (data: { name: string; avatar?: string }): Promise<User> => {
    const res = await apiClient.put<{ success: boolean; data: { user: User } }>('/user/profile', data);
    return res.data.data.user;
  },

  changePassword: async (data: { currentPassword: string; newPassword: string }): Promise<void> => {
    await apiClient.put('/user/password', data);
  },

  getStats: async (): Promise<{ total_forms: number; total_responses: number; published_forms: number }> => {
    const res = await apiClient.get<{
      success: boolean;
      data: { total_forms: number; total_responses: number; published_forms: number };
    }>('/user/stats');
    return res.data.data;
  },
};
