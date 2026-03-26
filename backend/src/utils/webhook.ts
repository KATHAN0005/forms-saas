import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { RowDataPacket } from 'mysql2';
import { logger } from './logger';
import crypto from 'crypto';

export async function getWebhooks(formId: string): Promise<RowDataPacket[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM webhooks WHERE form_id = ? AND is_active = 1',
    [formId]
  );
  return rows;
}

export async function triggerWebhooks(
  formId: string,
  event: string,
  payload: object
): Promise<void> {
  const webhooks = await getWebhooks(formId);

  for (const webhook of webhooks) {
    const events = typeof webhook.events === 'string' ? JSON.parse(webhook.events) : webhook.events;
    if (!events.includes(event)) continue;

    const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() });
    const signature = webhook.secret
      ? crypto.createHmac('sha256', webhook.secret).update(body).digest('hex')
      : null;

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(signature && { 'X-Webhook-Signature': signature }),
        },
        body,
      });
      logger.info(`Webhook ${webhook.id} triggered: ${response.status}`);
    } catch (error) {
      logger.error(`Webhook ${webhook.id} failed:`, error);
    }
  }
}

export async function createWebhook(
  formId: string,
  userId: string,
  data: { url: string; events: string[]; secret?: string }
): Promise<RowDataPacket> {
  const id = uuidv4();
  await pool.execute(
    'INSERT INTO webhooks (id, form_id, user_id, url, events, secret) VALUES (?, ?, ?, ?, ?, ?)',
    [id, formId, userId, data.url, JSON.stringify(data.events), data.secret || null]
  );
  const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM webhooks WHERE id = ?', [id]);
  return rows[0];
}

export async function deleteWebhook(id: string, userId: string): Promise<boolean> {
  const [result] = await pool.execute<import('mysql2').ResultSetHeader>(
    'DELETE FROM webhooks WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  return result.affectedRows > 0;
}
