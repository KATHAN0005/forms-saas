import { Router } from 'express';
import { updateProfile, changePassword, getUserStats } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.put('/profile', updateProfile);
router.put('/password', changePassword);
router.get('/stats', getUserStats);

export default router;
