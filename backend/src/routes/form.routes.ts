import { Router } from 'express';
import {
  getForms,
  getForm,
  createFormHandler,
  updateFormHandler,
  deleteFormHandler,
  duplicateFormHandler,
  getPublicForm,
  getFolders,
  createFolderHandler,
  updateFolderHandler,
  deleteFolderHandler,
} from '../controllers/form.controller';
import { authenticate } from '../middleware/auth';
import { validate, formSchema, folderSchema } from '../middleware/validation';

const router = Router();

// Public form access
router.get('/public/:slug', getPublicForm);

// Protected routes
router.use(authenticate);

router.get('/', getForms);
router.post('/', validate(formSchema), createFormHandler);
router.get('/:id', getForm);
router.put('/:id', validate(formSchema), updateFormHandler);
router.delete('/:id', deleteFormHandler);
router.post('/:id/duplicate', duplicateFormHandler);

// Folders
router.get('/folders/list', getFolders);
router.post('/folders', validate(folderSchema), createFolderHandler);
router.put('/folders/:id', validate(folderSchema), updateFolderHandler);
router.delete('/folders/:id', deleteFolderHandler);

export default router;
