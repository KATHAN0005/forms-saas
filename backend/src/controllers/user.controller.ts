import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { findUserById, updateUser, findUserByEmail, updateUserPassword } from '../models/user.model';
import pool from '../config/database';
import { RowDataPacket } from 'mysql2';

export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, avatar } = req.body;
    if (!name || name.trim().length < 2) {
      return next(createError('Name must be at least 2 characters', 400, 'INVALID_NAME'));
    }
    await updateUser(req.user!.id, { name: name.trim(), ...(avatar ? { avatar } : {}) });
    const user = await findUserById(req.user!.id);
    res.json({
      success: true,
      data: { user: { id: user!.id, name: user!.name, email: user!.email, avatar: user!.avatar } },
    });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return next(createError('Current and new passwords are required', 400, 'MISSING_FIELDS'));
    }
    if (newPassword.length < 8) {
      return next(createError('New password must be at least 8 characters', 400, 'PASSWORD_TOO_SHORT'));
    }

    const user = await findUserById(req.user!.id);
    if (!user || !user.password_hash) {
      return next(createError('Cannot change password for OAuth accounts', 400, 'OAUTH_ACCOUNT'));
    }

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      return next(createError('Current password is incorrect', 401, 'WRONG_PASSWORD'));
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await updateUserPassword(user.id, hash);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
}

export async function getUserStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const [formCount] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM forms WHERE user_id = ?',
      [req.user!.id]
    );
    const [responseCount] = await pool.execute<RowDataPacket[]>(
      'SELECT COALESCE(SUM(response_count), 0) as count FROM forms WHERE user_id = ?',
      [req.user!.id]
    );
    const [publishedCount] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM forms WHERE user_id = ? AND is_published = 1',
      [req.user!.id]
    );

    res.json({
      success: true,
      data: {
        stats: {
          total_forms: formCount[0].count,
          total_responses: responseCount[0].count,
          published_forms: publishedCount[0].count,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}
