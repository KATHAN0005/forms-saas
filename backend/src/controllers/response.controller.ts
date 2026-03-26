import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  createResponse,
  findResponsesByFormId,
  checkDuplicateResponse,
  savePartialResponse,
  getPartialResponse,
  getFormAnalytics,
} from '../models/response.model';
import { findFormBySlug, findFormById, incrementResponseCount } from '../models/form.model';
import { createError } from '../middleware/errorHandler';
import { triggerWebhooks } from '../utils/webhook';

export async function submitResponse(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const form = await findFormBySlug(req.params.slug);
    if (!form) return next(createError('Form not found', 404, 'FORM_NOT_FOUND'));
    if (!form.is_published) return next(createError('Form is not available', 403, 'FORM_UNAVAILABLE'));
    if (form.is_closed) return next(createError('Form is closed', 403, 'FORM_CLOSED'));

    const settings = form.settings as Record<string, unknown>;

    // Check response limit
    if (settings.response_limit) {
      const limit = parseInt(String(settings.response_limit));
      if (form.response_count >= limit) {
        return next(createError('Form has reached its response limit', 403, 'RESPONSE_LIMIT_REACHED'));
      }
    }

    const { answers, respondent_email, session_id } = req.body;

    // Check duplicate submission
    if (!settings.allow_multiple_submissions) {
      const ip = req.ip || req.socket.remoteAddress || null;
      const isDuplicate = await checkDuplicateResponse(form.id, ip, respondent_email || null);
      if (isDuplicate) {
        return next(createError('You have already submitted this form', 409, 'DUPLICATE_SUBMISSION'));
      }
    }

    const response = await createResponse({
      form_id: form.id,
      answers,
      respondent_email: respondent_email || null,
      ip_address: req.ip || req.socket.remoteAddress || null,
      user_agent: req.headers['user-agent'] || null,
      session_id: session_id || null,
    });

    await incrementResponseCount(form.id);

    // Trigger webhooks async
    triggerWebhooks(form.id, 'response.submitted', {
      form_id: form.id,
      response_id: response.id,
      answers,
    }).catch(() => {});

    const confirmationMessage = String(settings.confirmation_message || 'Thank you for your response!');

    res.status(201).json({
      success: true,
      message: confirmationMessage,
      data: { response_id: response.id },
    });
  } catch (error) {
    next(error);
  }
}

export async function savePartialResponseHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const form = await findFormBySlug(req.params.slug);
    if (!form) return next(createError('Form not found', 404, 'FORM_NOT_FOUND'));

    const { answers, session_id, respondent_email } = req.body;
    if (!session_id) return next(createError('Session ID required', 400, 'MISSING_SESSION'));

    await savePartialResponse({
      form_id: form.id,
      session_id,
      answers,
      respondent_email,
    });

    res.json({ success: true, message: 'Progress saved' });
  } catch (error) {
    next(error);
  }
}

export async function getPartialResponseHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const form = await findFormBySlug(req.params.slug);
    if (!form) return next(createError('Form not found', 404, 'FORM_NOT_FOUND'));

    const { session_id } = req.query as { session_id: string };
    if (!session_id) return next(createError('Session ID required', 400, 'MISSING_SESSION'));

    const partial = await getPartialResponse(form.id, session_id);
    res.json({ success: true, data: { partial } });
  } catch (error) {
    next(error);
  }
}

export async function getResponses(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const form = await findFormById(req.params.id, req.user!.id);
    if (!form) return next(createError('Form not found', 404, 'FORM_NOT_FOUND'));

    const { page, limit } = req.query as { page: string; limit: string };
    const result = await findResponsesByFormId(form.id, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getAnalytics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const form = await findFormById(req.params.id, req.user!.id);
    if (!form) return next(createError('Form not found', 404, 'FORM_NOT_FOUND'));

    const analytics = await getFormAnalytics(form.id);
    res.json({ success: true, data: { analytics } });
  } catch (error) {
    next(error);
  }
}

export async function exportResponses(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const form = await findFormById(req.params.id, req.user!.id);
    if (!form) return next(createError('Form not found', 404, 'FORM_NOT_FOUND'));

    const { responses } = await findResponsesByFormId(form.id, { page: 1, limit: 10000 });

    // Build CSV
    const schema = form.schema as { questions: Record<string, { title: string }>; order: string[] };
    const headers = ['Response ID', 'Submitted At', 'Email', ...schema.order.map(id => schema.questions[id]?.title || id)];

    const rows = responses.map((r) => {
      const answers = r.answers as Record<string, unknown>;
      return [
        r.id,
        r.submitted_at,
        r.respondent_email || '',
        ...schema.order.map(id => {
          const val = answers[id];
          return Array.isArray(val) ? val.join('; ') : String(val ?? '');
        }),
      ];
    });

    const csv = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="responses-${form.id}.csv"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
}
