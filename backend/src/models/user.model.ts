import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string | null;
  google_id: string | null;
  avatar: string | null;
  role: string;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export async function createUser(data: {
  name: string;
  email: string;
  password_hash?: string;
  google_id?: string;
  avatar?: string;
}): Promise<User> {
  const id = uuidv4();
  await pool.execute(
    `INSERT INTO users (id, name, email, password_hash, google_id, avatar, role, is_verified)
     VALUES (?, ?, ?, ?, ?, ?, 'user', ?)`,
    [
      id,
      data.name,
      data.email,
      data.password_hash || null,
      data.google_id || null,
      data.avatar || null,
      data.google_id ? true : false,
    ]
  );
  return findUserById(id) as Promise<User>;
}

export async function findUserById(id: string): Promise<User | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM users WHERE id = ?',
    [id]
  );
  return (rows[0] as User) || null;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM users WHERE email = ?',
    [email]
  );
  return (rows[0] as User) || null;
}

export async function findUserByGoogleId(googleId: string): Promise<User | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM users WHERE google_id = ?',
    [googleId]
  );
  return (rows[0] as User) || null;
}

export async function updateUser(
  id: string,
  data: Partial<{ name: string; avatar: string; is_verified: boolean }>
): Promise<void> {
  const fields = Object.keys(data)
    .map((k) => `${k} = ?`)
    .join(', ');
  const values = [...Object.values(data), id];
  await pool.execute(`UPDATE users SET ${fields}, updated_at = NOW() WHERE id = ?`, values);
}

export async function saveRefreshToken(
  userId: string,
  token: string,
  expiresAt: Date
): Promise<void> {
  const id = uuidv4();
  await pool.execute(
    `INSERT INTO refresh_tokens (id, user_id, token, expires_at)
     VALUES (?, ?, ?, ?)`,
    [id, userId, token, expiresAt]
  );
}

export async function findRefreshToken(token: string): Promise<RowDataPacket | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > NOW() AND revoked = 0',
    [token]
  );
  return rows[0] || null;
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await pool.execute('UPDATE refresh_tokens SET revoked = 1 WHERE token = ?', [token]);
}

export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  await pool.execute('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?', [userId]);
}

export async function savePasswordResetToken(
  userId: string,
  token: string,
  expiresAt: Date
): Promise<void> {
  await pool.execute('DELETE FROM password_resets WHERE user_id = ?', [userId]);
  const id = uuidv4();
  await pool.execute(
    'INSERT INTO password_resets (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
    [id, userId, token, expiresAt]
  );
}

export async function findPasswordResetToken(token: string): Promise<RowDataPacket | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM password_resets WHERE token = ? AND expires_at > NOW() AND used = 0',
    [token]
  );
  return rows[0] || null;
}

export async function markPasswordResetUsed(token: string): Promise<void> {
  await pool.execute('UPDATE password_resets SET used = 1 WHERE token = ?', [token]);
}

export async function updateUserPassword(userId: string, passwordHash: string): Promise<void> {
  await pool.execute(
    'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
    [passwordHash, userId]
  );
}
