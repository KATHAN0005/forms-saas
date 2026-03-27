import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface Form {
  id: string;
  user_id: string;
  folder_id: string | null;
  title: string;
  description: string | null;
  schema: object;
  settings: object;
  theme: object;
  is_published: boolean;
  is_closed: boolean;
  slug: string;
  response_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface FormListItem {
  id: string;
  title: string;
  description: string | null;
  is_published: boolean;
  is_closed: boolean;
  slug: string;
  response_count: number;
  folder_id: string | null;
  folder_name: string | null;
  created_at: Date;
  updated_at: Date;
}

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 40);
  const suffix = uuidv4().split('-')[0];
  return `${base}-${suffix}`;
}

export async function createForm(
  userId: string,
  data: {
    title: string;
    description?: string;
    schema?: object;
    settings?: object;
    theme?: object;
    folder_id?: string | null;
  }
): Promise<Form> {
  const id = uuidv4();
  const slug = generateSlug(data.title);
  await pool.execute(
    `INSERT INTO forms (id, user_id, folder_id, title, description, schema, settings, theme, slug)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      userId,
      data.folder_id || null,
      data.title,
      data.description || null,
      JSON.stringify(data.schema || { questions: {}, order: [] }),
      JSON.stringify(data.settings || {}),
      JSON.stringify(data.theme || {}),
      slug,
    ]
  );
  return findFormById(id, userId) as Promise<Form>;
}

export async function findFormById(
  id: string,
  userId?: string
): Promise<Form | null> {
  let query = 'SELECT * FROM forms WHERE id = ?';
  const params: string[] = [id];
  if (userId) {
    query += ' AND user_id = ?';
    params.push(userId);
  }
  const [rows] = await pool.execute<RowDataPacket[]>(query, params);
  if (!rows[0]) return null;
  return parseFormRow(rows[0]);
}

export async function findFormBySlug(slug: string): Promise<Form | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM forms WHERE slug = ?',
    [slug]
  );
  if (!rows[0]) return null;
  return parseFormRow(rows[0]);
}

export async function listForms(
  userId: string,
  options: {
    search?: string;
    folder_id?: string | null;
    page?: number;
    limit?: number;
  } = {}
): Promise<{ forms: FormListItem[]; total: number }> {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const offset = (page - 1) * limit;

  let where = 'f.user_id = ?';
  const params: (string | number | null)[] = [userId];

  if (options.search) {
    where += ' AND f.title LIKE ?';
    params.push(`%${options.search}%`);
  }

  if (options.folder_id !== undefined) {
    where += options.folder_id ? ' AND f.folder_id = ?' : ' AND f.folder_id IS NULL';
    if (options.folder_id) params.push(options.folder_id);
  }

  const [countRows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) as total FROM forms f WHERE ${where}`,
    params
  );
  const total = countRows[0].total;

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT f.id, f.title, f.description, f.is_published, f.is_closed, f.slug,
            f.response_count, f.folder_id, fo.name as folder_name, f.created_at, f.updated_at
     FROM forms f
     LEFT JOIN folders fo ON f.folder_id = fo.id
     WHERE ${where}
     ORDER BY f.updated_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return { forms: rows as FormListItem[], total };
}

export async function updateForm(
  id: string,
  userId: string,
  data: Partial<{
    title: string;
    description: string;
    schema: object;
    settings: object;
    theme: object;
    folder_id: string | null;
    is_published: boolean;
    is_closed: boolean;
  }>
): Promise<Form | null> {
  const updates: string[] = [];
  const values: (string | number | boolean | null)[] = [];

  if (data.title !== undefined) { updates.push('title = ?'); values.push(data.title); }
  if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
  if (data.schema !== undefined) { updates.push('schema = ?'); values.push(JSON.stringify(data.schema)); }
  if (data.settings !== undefined) { updates.push('settings = ?'); values.push(JSON.stringify(data.settings)); }
  if (data.theme !== undefined) { updates.push('theme = ?'); values.push(JSON.stringify(data.theme)); }
  if (data.folder_id !== undefined) { updates.push('folder_id = ?'); values.push(data.folder_id); }
  if (data.is_published !== undefined) { updates.push('is_published = ?'); values.push(data.is_published); }
  if (data.is_closed !== undefined) { updates.push('is_closed = ?'); values.push(data.is_closed); }

  if (updates.length === 0) return findFormById(id, userId);

  updates.push('updated_at = NOW()');
  values.push(id, userId);

  await pool.execute(
    `UPDATE forms SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
    values
  );

  return findFormById(id, userId);
}

export async function deleteForm(id: string, userId: string): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM forms WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  return result.affectedRows > 0;
}

export async function duplicateForm(id: string, userId: string): Promise<Form | null> {
  const original = await findFormById(id, userId);
  if (!original) return null;

  const newId = uuidv4();
  const slug = generateSlug(`${original.title} copy`);

  await pool.execute(
    `INSERT INTO forms (id, user_id, folder_id, title, description, schema, settings, theme, slug)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newId,
      userId,
      original.folder_id,
      `${original.title} (Copy)`,
      original.description,
      JSON.stringify(original.schema),
      JSON.stringify(original.settings),
      JSON.stringify(original.theme),
      slug,
    ]
  );

  return findFormById(newId, userId);
}

export async function incrementResponseCount(formId: string): Promise<void> {
  await pool.execute(
    'UPDATE forms SET response_count = response_count + 1 WHERE id = ?',
    [formId]
  );
}

function parseFormRow(row: RowDataPacket): Form {
  return {
    ...row,
    schema: typeof row.schema === 'string' ? JSON.parse(row.schema) : row.schema,
    settings: typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings,
    theme: typeof row.theme === 'string' ? JSON.parse(row.theme) : row.theme,
    is_published: Boolean(row.is_published),
    is_closed: Boolean(row.is_closed),
  } as Form;
}

export async function trackFormView(formId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const id = uuidv4();
  await pool.execute(
    `INSERT INTO analytics (id, form_id, date, views) VALUES (?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE views = views + 1`,
    [id, formId, today]
  );
}

export async function getFormWithStats(formId: string, userId: string): Promise<object | null> {
  const [rows] = await pool.execute<import('mysql2').RowDataPacket[]>(
    `SELECT f.*, 
       (SELECT SUM(views) FROM analytics WHERE form_id = f.id) as total_views,
       (SELECT SUM(submissions) FROM analytics WHERE form_id = f.id) as total_submissions_from_analytics
     FROM forms f WHERE f.id = ? AND f.user_id = ?`,
    [formId, userId]
  );
  if (!rows[0]) return null;
  const row = rows[0];
  return {
    ...row,
    schema: typeof row.schema === 'string' ? JSON.parse(row.schema) : row.schema,
    settings: typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings,
    theme: typeof row.theme === 'string' ? JSON.parse(row.theme) : row.theme,
    is_published: Boolean(row.is_published),
    is_closed: Boolean(row.is_closed),
  };
}
