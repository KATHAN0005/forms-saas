import apiClient from './client';
import { Form, FormListItem, Folder, FormSchema, FormSettings, FormTheme } from '../types';

interface ListResponse {
  success: boolean;
  data: { forms: FormListItem[]; total: number };
}

export const formsApi = {
  list: async (params?: { search?: string; folder_id?: string | null; page?: number; limit?: number }) => {
    const res = await apiClient.get<ListResponse>('/forms', { params });
    return res.data.data;
  },

  get: async (id: string) => {
    const res = await apiClient.get<{ success: boolean; data: { form: Form } }>(`/forms/${id}`);
    return res.data.data.form;
  },

  getPublic: async (slug: string, password?: string) => {
    const headers: Record<string, string> = {};
    if (password) headers['X-Form-Password'] = password;
    const res = await apiClient.get<{ success: boolean; data: { form: Form } }>(`/forms/public/${slug}`, { headers });
    return res.data.data.form;
  },

  create: async (data: { title: string; description?: string; folder_id?: string | null }) => {
    const res = await apiClient.post<{ success: boolean; data: { form: Form } }>('/forms', data);
    return res.data.data.form;
  },

  update: async (id: string, data: Partial<{
    title: string;
    description: string;
    schema: FormSchema;
    settings: FormSettings;
    theme: FormTheme;
    folder_id: string | null;
    is_published: boolean;
    is_closed: boolean;
  }>) => {
    const res = await apiClient.put<{ success: boolean; data: { form: Form } }>(`/forms/${id}`, data);
    return res.data.data.form;
  },

  delete: async (id: string) => {
    await apiClient.delete(`/forms/${id}`);
  },

  duplicate: async (id: string) => {
    const res = await apiClient.post<{ success: boolean; data: { form: Form } }>(`/forms/${id}/duplicate`);
    return res.data.data.form;
  },

  // Folders
  getFolders: async () => {
    const res = await apiClient.get<{ success: boolean; data: { folders: Folder[] } }>('/forms/folders/list');
    return res.data.data.folders;
  },

  createFolder: async (data: { name: string; color?: string }) => {
    const res = await apiClient.post<{ success: boolean; data: { folder: Folder } }>('/forms/folders', data);
    return res.data.data.folder;
  },

  updateFolder: async (id: string, data: { name?: string; color?: string }) => {
    const res = await apiClient.put<{ success: boolean; data: { folder: Folder } }>(`/forms/folders/${id}`, data);
    return res.data.data.folder;
  },

  deleteFolder: async (id: string) => {
    await apiClient.delete(`/forms/folders/${id}`);
  },
};
