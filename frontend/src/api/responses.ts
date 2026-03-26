import apiClient from './client';
import { Response, Analytics } from '../types';

export const responsesApi = {
  submit: async (slug: string, data: {
    answers: Record<string, unknown>;
    respondent_email?: string;
    session_id?: string;
  }) => {
    const res = await apiClient.post(`/forms/${slug}/submit`, data);
    return res.data;
  },

  savePartial: async (slug: string, data: {
    answers: Record<string, unknown>;
    session_id: string;
    respondent_email?: string;
  }) => {
    const res = await apiClient.post(`/forms/${slug}/partial`, data);
    return res.data;
  },

  getPartial: async (slug: string, session_id: string) => {
    const res = await apiClient.get(`/forms/${slug}/partial`, { params: { session_id } });
    return res.data.data.partial;
  },

  getResponses: async (formId: string, params?: { page?: number; limit?: number }) => {
    const res = await apiClient.get<{ success: boolean; data: { responses: Response[]; total: number } }>(
      `/forms/${formId}/responses`,
      { params }
    );
    return res.data.data;
  },

  getAnalytics: async (formId: string) => {
    const res = await apiClient.get<{ success: boolean; data: { analytics: Analytics } }>(
      `/forms/${formId}/analytics`
    );
    return res.data.data.analytics;
  },

  exportCSV: async (formId: string) => {
    const res = await apiClient.get(`/forms/${formId}/export`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `responses-${formId}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  },
};
