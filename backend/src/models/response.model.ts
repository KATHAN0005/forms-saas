import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface Response {
  id: string;
  form_id: string;
  respondent_email: string | null;
  answers: object;
  ip_address: string | null;
  user_agent: string | null;
  session_id: string | null;
  submitted_at: Date;
}

export async function createResponse(data: {
  form_id: string;
  answers: object;
  respondent_email?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  session_id?: string | null;
}): Promise<Response> {
  const id = uuidv4();
  await pool.execute(
    `INSERT INTO responses (id, form_id, respondent_email, answers, ip_address, user_agent, session_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.form_id,
      data.respondent_email || null,
      JSON.stringify(data.answers),
      data.ip_address || null,
      data.user_agent || null,
      data.session_id || null,
    ]
  );
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM responses WHERE id = ?',
    [id]
  );
  return parseResponseRow(rows[0]);
}

export async function findResponsesByFormId(
  formId: string,
  options: { page?: number; limit?: number } = {}
): Promise<{ responses: Response[]; total: number }> {
  const page = options.page || 1;
  const limit = options.limit || 50;
  const offset = (page - 1) * limit;

  const [countRows] = await pool.execute<RowDataPacket[]>(
    'SELECT COUNT(*) as total FROM responses WHERE form_id = ?',
    [formId]
  );
  const total = countRows[0].total;

  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM responses WHERE form_id = ? ORDER BY submitted_at DESC LIMIT ? OFFSET ?',
    [formId, limit, offset]
  );

  return {
    responses: rows.map(parseResponseRow),
    total,
  };
}

export async function checkDuplicateResponse(
  formId: string,
  ipAddress: string | null,
  email: string | null
): Promise<boolean> {
  if (!ipAddress && !email) return false;

  if (email) {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM responses WHERE form_id = ? AND respondent_email = ? LIMIT 1',
      [formId, email]
    );
    if (rows.length > 0) return true;
  }

  if (ipAddress) {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM responses WHERE form_id = ? AND ip_address = ? AND submitted_at > DATE_SUB(NOW(), INTERVAL 1 HOUR) LIMIT 1',
      [formId, ipAddress]
    );
    if (rows.length > 0) return true;
  }

  return false;
}

export async function savePartialResponse(data: {
  form_id: string;
  session_id: string;
  answers: object;
  respondent_email?: string | null;
}): Promise<void> {
  const id = uuidv4();
  await pool.execute(
    `INSERT INTO partial_responses (id, form_id, session_id, answers, respondent_email)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE answers = VALUES(answers), updated_at = NOW()`,
    [
      id,
      data.form_id,
      data.session_id,
      JSON.stringify(data.answers),
      data.respondent_email || null,
    ]
  );
}

export async function getPartialResponse(
  formId: string,
  sessionId: string
): Promise<RowDataPacket | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM partial_responses WHERE form_id = ? AND session_id = ?',
    [formId, sessionId]
  );
  if (!rows[0]) return null;
  const row = rows[0];
  return {
    ...row,
    answers: typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers,
  } as RowDataPacket;
}

export async function getFormAnalytics(formId: string): Promise<object> {
  const [totalRows] = await pool.execute<RowDataPacket[]>(
    'SELECT COUNT(*) as total FROM responses WHERE form_id = ?',
    [formId]
  );

  const [dailyRows] = await pool.execute<RowDataPacket[]>(
    `SELECT DATE(submitted_at) as date, COUNT(*) as count
     FROM responses
     WHERE form_id = ? AND submitted_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
     GROUP BY DATE(submitted_at)
     ORDER BY date`,
    [formId]
  );

  const [allResponses] = await pool.execute<RowDataPacket[]>(
    'SELECT answers FROM responses WHERE form_id = ?',
    [formId]
  );

  const questionStats: Record<string, { counts: Record<string, number>; total: number }> = {};

  for (const row of allResponses) {
    const answers = typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers;
    for (const [questionId, answer] of Object.entries(answers)) {
      if (!questionStats[questionId]) {
        questionStats[questionId] = { counts: {}, total: 0 };
      }
      questionStats[questionId].total++;
      const answerStr = Array.isArray(answer) ? answer.join(', ') : String(answer);
      questionStats[questionId].counts[answerStr] =
        (questionStats[questionId].counts[answerStr] || 0) + 1;
    }
  }

  return {
    total_responses: totalRows[0].total,
    daily_responses: dailyRows,
    question_stats: questionStats,
  };
}

function parseResponseRow(row: RowDataPacket): Response {
  return {
    ...row,
    answers: typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers,
  } as Response;
}
