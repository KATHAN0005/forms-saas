import { Router } from 'express';
import { generateForm } from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth';
import Joi from 'joi';
import { validate } from '../middleware/validation';

const router = Router();

const aiSchema = Joi.object({ prompt: Joi.string().min(3).max(500).required() });

router.post('/generate', authenticate, validate(aiSchema), generateForm);

export default router;
