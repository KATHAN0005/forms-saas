import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import {
  createUser,
  findUserByEmail,
  findUserByGoogleId,
  findUserById,
  saveRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
  savePasswordResetToken,
  findPasswordResetToken,
  markPasswordResetUsed,
  updateUserPassword,
} from '../models/user.model';
import { createError } from '../middleware/errorHandler';
import { sendPasswordResetEmail } from '../utils/email';
import { logger } from '../utils/logger';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function generateTokens(user: { id: string; email: string; role: string }) {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as string } as jwt.SignOptions
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET || 'refresh_secret',
    { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as string } as jwt.SignOptions
  );

  return { accessToken, refreshToken };
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, password } = req.body;

    const existing = await findUserByEmail(email);
    if (existing) {
      return next(createError('Email already in use', 409, 'EMAIL_EXISTS'));
    }

    const password_hash = await bcrypt.hash(password, 12);
    const user = await createUser({ name, email, password_hash });

    const { accessToken, refreshToken } = generateTokens(user);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await saveRefreshToken(user.id, refreshToken, expiresAt);

    logger.info(`New user registered: ${email}`);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;

    const user = await findUserByEmail(email);
    if (!user || !user.password_hash) {
      return next(createError('Invalid email or password', 401, 'INVALID_CREDENTIALS'));
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return next(createError('Invalid email or password', 401, 'INVALID_CREDENTIALS'));
    }

    const { accessToken, refreshToken } = generateTokens(user);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await saveRefreshToken(user.id, refreshToken, expiresAt);

    res.json({
      success: true,
      data: {
        user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function googleAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { credential } = req.body;
    if (!credential) {
      return next(createError('Google credential required', 400, 'MISSING_CREDENTIAL'));
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return next(createError('Invalid Google token', 401, 'INVALID_GOOGLE_TOKEN'));
    }

    let user = await findUserByGoogleId(payload.sub);
    if (!user) {
      user = await findUserByEmail(payload.email);
      if (!user) {
        user = await createUser({
          name: payload.name || payload.email,
          email: payload.email,
          google_id: payload.sub,
          avatar: payload.picture,
        });
      }
    }

    const { accessToken, refreshToken } = generateTokens(user);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await saveRefreshToken(user.id, refreshToken, expiresAt);

    res.json({
      success: true,
      data: {
        user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      return next(createError('Refresh token required', 400, 'MISSING_TOKEN'));
    }

    const storedToken = await findRefreshToken(token);
    if (!storedToken) {
      return next(createError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN'));
    }

    let decoded: { id: string };
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'refresh_secret') as {
        id: string;
      };
    } catch {
      return next(createError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN'));
    }

    const user = await findUserById(decoded.id);
    if (!user) {
      return next(createError('User not found', 404, 'USER_NOT_FOUND'));
    }

    await revokeRefreshToken(token);

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await saveRefreshToken(user.id, newRefreshToken, expiresAt);

    res.json({
      success: true,
      data: { accessToken, refreshToken: newRefreshToken },
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken: token } = req.body;
    if (token) {
      await revokeRefreshToken(token);
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req: Request & { user?: { id: string } }, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await findUserById(req.user!.id);
    if (!user) {
      return next(createError('User not found', 404, 'USER_NOT_FOUND'));
    }
    res.json({
      success: true,
      data: {
        user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar, role: user.role },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body;
    const user = await findUserByEmail(email);

    // Always respond positively to prevent email enumeration
    if (!user) {
      res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await savePasswordResetToken(user.id, token, expiresAt);

    await sendPasswordResetEmail(user.email, user.name, token);

    res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, password } = req.body;

    const resetRecord = await findPasswordResetToken(token);
    if (!resetRecord) {
      return next(createError('Invalid or expired reset token', 400, 'INVALID_RESET_TOKEN'));
    }

    const password_hash = await bcrypt.hash(password, 12);
    await updateUserPassword(resetRecord.user_id, password_hash);
    await markPasswordResetUsed(token);
    await revokeAllUserRefreshTokens(resetRecord.user_id);

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
}
