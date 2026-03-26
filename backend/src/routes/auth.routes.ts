import { Router } from 'express';
import {
  register,
  login,
  googleAuth,
  refreshToken,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate, registerSchema, loginSchema, passwordResetRequestSchema, passwordResetSchema } from '../middleware/validation';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/google', googleAuth);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);
router.post('/forgot-password', validate(passwordResetRequestSchema), forgotPassword);
router.post('/reset-password', validate(passwordResetSchema), resetPassword);

export default router;
