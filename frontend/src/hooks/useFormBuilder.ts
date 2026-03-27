import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { useBuilderStore } from '@/store/builderStore';
import { formsApi } from '@/api/forms';

export function useFormBuilder() {
  const store = useBuilderStore();

  const save = useCallback(async () => {
    const { formId, title, description, schema, settings, theme, isPublished } = store;
    if (!formId) return;

    store.setSaving(true);
    try {
      await formsApi.update(formId, {
        title,
        description,
        schema,
        settings,
        theme,
        is_published: isPublished,
      });
      store.markClean();
    } catch {
      throw new Error('Save failed');
    } finally {
      store.setSaving(false);
    }
  }, [store]);

  const saveWithToast = useCallback(async () => {
    try {
      await save();
      toast.success('Form saved');
    } catch {
      toast.error('Failed to save form');
    }
  }, [save]);

  return { ...store, save, saveWithToast };
}
