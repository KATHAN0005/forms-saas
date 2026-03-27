import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { findFormById } from '../models/form.model';
import { createWebhook, deleteWebhook, getWebhooks } from '../utils/webhook';
import pool from '../config/database';
import { RowDataPacket } from 'mysql2';

export async function listWebhooks(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const form = await findFormById(req.params.id, req.user!.id);
    if (!form) return next(createError('Form not found', 404, 'FORM_NOT_FOUND'));

    const webhooks = await getWebhooks(form.id);
    // Strip secret from response
    const safe = webhooks.map(({ secret: _s, ...rest }) => rest);
    res.json({ success: true, data: { webhooks: safe } });
  } catch (error) {
    next(error);
  }
}

export async function createWebhookHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const form = await findFormById(req.params.id, req.user!.id);
    if (!form) return next(createError('Form not found', 404, 'FORM_NOT_FOUND'));

    const webhook = await createWebhook(form.id, req.user!.id, req.body);
    const { secret: _s, ...safe } = webhook;
    res.status(201).json({ success: true, data: { webhook: safe } });
  } catch (error) {
    next(error);
  }
}

export async function deleteWebhookHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const deleted = await deleteWebhook(req.params.webhookId, req.user!.id);
    if (!deleted) return next(createError('Webhook not found', 404, 'WEBHOOK_NOT_FOUND'));
    res.json({ success: true, message: 'Webhook deleted' });
  } catch (error) {
    next(error);
  }
}

export async function toggleWebhook(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM webhooks WHERE id = ? AND user_id = ?',
      [req.params.webhookId, req.user!.id]
    );
    if (!rows[0]) return next(createError('Webhook not found', 404, 'WEBHOOK_NOT_FOUND'));

    const newActive = !rows[0].is_active;
    await pool.execute('UPDATE webhooks SET is_active = ? WHERE id = ?', [newActive, req.params.webhookId]);
    res.json({ success: true, data: { is_active: newActive } });
  } catch (error) {
    next(error);
  }
}
