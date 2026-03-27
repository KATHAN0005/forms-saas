import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: Date;
}

export async function createFolder(
  userId: string,
  data: { name: string; color?: string }
): Promise<Folder> {
  const id = uuidv4();
  await pool.execute(
    'INSERT INTO folders (id, user_id, name, color) VALUES (?, ?, ?, ?)',
    [id, userId, data.name, data.color || '#3B82F6']
  );
  return findFolderById(id, userId) as Promise<Folder>;
}

export async function findFolderById(
  id: string,
  userId: string
): Promise<Folder | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM folders WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  return (rows[0] as Folder) || null;
}

export async function listFolders(userId: string): Promise<Folder[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM folders WHERE user_id = ? ORDER BY name ASC',
    [userId]
  );
  return rows as Folder[];
}

export async function updateFolder(
  id: string,
  userId: string,
  data: { name?: string; color?: string }
): Promise<Folder | null> {
  const updates: string[] = [];
  const values: string[] = [];
  if (data.name) { updates.push('name = ?'); values.push(data.name); }
  if (data.color) { updates.push('color = ?'); values.push(data.color); }
  if (updates.length === 0) return findFolderById(id, userId);
  values.push(id, userId);
  await pool.execute(
    `UPDATE folders SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
    values
  );
  return findFolderById(id, userId);
}

export async function deleteFolder(id: string, userId: string): Promise<boolean> {
  await pool.execute('UPDATE forms SET folder_id = NULL WHERE folder_id = ?', [id]);
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM folders WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  return result.affectedRows > 0;
}
