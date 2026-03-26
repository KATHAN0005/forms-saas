import { Router } from 'express';
import {
  submitResponse,
  savePartialResponseHandler,
  getPartialResponseHandler,
  getResponses,
  getAnalytics,
  exportResponses,
} from '../controllers/response.controller';
import { authenticate } from '../middleware/auth';
import { validate, responseSchema } from '../middleware/validation';

const router = Router();

// Public endpoints
router.post('/forms/:slug/submit', validate(responseSchema), submitResponse);
router.post('/forms/:slug/partial', savePartialResponseHandler);
router.get('/forms/:slug/partial', getPartialResponseHandler);

// Protected endpoints
router.get('/forms/:id/responses', authenticate, getResponses);
router.get('/forms/:id/analytics', authenticate, getAnalytics);
router.get('/forms/:id/export', authenticate, exportResponses);

export default router;
