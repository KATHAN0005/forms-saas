import { Router } from 'express';
import {
  listWebhooks,
  createWebhookHandler,
  deleteWebhookHandler,
  toggleWebhook,
} from '../controllers/webhook.controller';
import { authenticate } from '../middleware/auth';
import { validate, webhookSchema } from '../middleware/validation';

const router = Router();
router.use(authenticate);

router.get('/:id/webhooks', listWebhooks);
router.post('/:id/webhooks', validate(webhookSchema), createWebhookHandler);
router.delete('/:id/webhooks/:webhookId', deleteWebhookHandler);
router.patch('/:id/webhooks/:webhookId/toggle', toggleWebhook);

export default router;
