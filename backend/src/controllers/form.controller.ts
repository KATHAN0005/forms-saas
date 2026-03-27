import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  createForm,
  findFormById,
  findFormBySlug,
  listForms,
  updateForm,
  deleteForm,
  duplicateForm,
} from '../models/form.model';
import {
  createFolder,
  listFolders,
  updateFolder,
  deleteFolder,
} from '../models/folder.model';
import { createError } from '../middleware/errorHandler';

export async function getForms(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { search, folder_id, page, limit } = req.query as Record<string, string>;
    const result = await listForms(req.user!.id, {
      search,
      folder_id: folder_id === 'null' ? null : folder_id,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getForm(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const form = await findFormById(req.params.id, req.user!.id);
    if (!form) return next(createError('Form not found', 404, 'FORM_NOT_FOUND'));
    res.json({ success: true, data: { form } });
  } catch (error) {
    next(error);
  }
}

export async function createFormHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const form = await createForm(req.user!.id, req.body);
    res.status(201).json({ success: true, data: { form } });
  } catch (error) {
    next(error);
  }
}

export async function updateFormHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const form = await updateForm(req.params.id, req.user!.id, req.body);
    if (!form) return next(createError('Form not found', 404, 'FORM_NOT_FOUND'));
    res.json({ success: true, data: { form } });
  } catch (error) {
    next(error);
  }
}

export async function deleteFormHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const deleted = await deleteForm(req.params.id, req.user!.id);
    if (!deleted) return next(createError('Form not found', 404, 'FORM_NOT_FOUND'));
    res.json({ success: true, message: 'Form deleted successfully' });
  } catch (error) {
    next(error);
  }
}

export async function duplicateFormHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const form = await duplicateForm(req.params.id, req.user!.id);
    if (!form) return next(createError('Form not found', 404, 'FORM_NOT_FOUND'));
    res.status(201).json({ success: true, data: { form } });
  } catch (error) {
    next(error);
  }
}

export async function getPublicForm(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const form = await findFormBySlug(req.params.slug);
    if (!form) return next(createError('Form not found', 404, 'FORM_NOT_FOUND'));
    if (!form.is_published) return next(createError('This form is not available', 403, 'FORM_UNAVAILABLE'));

    const settings = form.settings as Record<string, unknown>;
    const passwordProtected = settings.password_protected;
    const providedPassword = req.headers['x-form-password'] as string;

    if (passwordProtected) {
      if (!providedPassword || providedPassword !== settings.form_password) {
        return next(createError('Password required', 401, 'PASSWORD_REQUIRED'));
      }
    }

    res.json({
      success: true,
      data: {
        form: {
          id: form.id,
          title: form.title,
          description: form.description,
          schema: form.schema,
          settings: {
            collect_email: settings.collect_email,
            allow_multiple_submissions: settings.allow_multiple_submissions,
            show_progress_bar: settings.show_progress_bar,
            confirmation_message: settings.confirmation_message,
          },
          is_closed: form.is_closed,
          theme: form.theme,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

// Folder handlers
export async function getFolders(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const folders = await listFolders(req.user!.id);
    res.json({ success: true, data: { folders } });
  } catch (error) {
    next(error);
  }
}

export async function createFolderHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const folder = await createFolder(req.user!.id, req.body);
    res.status(201).json({ success: true, data: { folder } });
  } catch (error) {
    next(error);
  }
}

export async function updateFolderHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const folder = await updateFolder(req.params.id, req.user!.id, req.body);
    if (!folder) return next(createError('Folder not found', 404, 'FOLDER_NOT_FOUND'));
    res.json({ success: true, data: { folder } });
  } catch (error) {
    next(error);
  }
}

export async function deleteFolderHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const deleted = await deleteFolder(req.params.id, req.user!.id);
    if (!deleted) return next(createError('Folder not found', 404, 'FOLDER_NOT_FOUND'));
    res.json({ success: true, message: 'Folder deleted successfully' });
  } catch (error) {
    next(error);
  }
}
