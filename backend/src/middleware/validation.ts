import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { createError } from './errorHandler';

export function validate(schema: Joi.ObjectSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const messages = error.details.map((d) => d.message).join(', ');
      return next(createError(messages, 422, 'VALIDATION_ERROR'));
    }
    next();
  };
}

export const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(100).required(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const passwordResetRequestSchema = Joi.object({
  email: Joi.string().email().required(),
});

export const passwordResetSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(8).max(100).required(),
});

export const formSchema = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(1000).allow('').optional(),
  schema: Joi.object().optional(),
  settings: Joi.object().optional(),
  folder_id: Joi.string().uuid().allow(null).optional(),
  is_published: Joi.boolean().optional(),
  theme: Joi.object().optional(),
});

export const folderSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  color: Joi.string().max(20).optional(),
});

export const responseSchema = Joi.object({
  answers: Joi.object().required(),
  respondent_email: Joi.string().email().allow('', null).optional(),
  partial: Joi.boolean().optional(),
  session_id: Joi.string().optional(),
});

export const webhookSchema = Joi.object({
  url: Joi.string().uri().required(),
  events: Joi.array().items(Joi.string()).required(),
  secret: Joi.string().optional(),
});
