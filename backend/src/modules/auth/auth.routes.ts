/**
 * Auth Module - Routes
 * Express router for authentication endpoints
 */

import { Router } from 'express';
import * as authController from './auth.controller';
import { authMiddleware, optionalAuthMiddleware } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { googleAuthSchema, refreshTokenSchema, logoutSchema } from './auth.types';

const router = Router();

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user
 * @access  Private
 */
router.get('/me', authMiddleware, authController.getCurrentUser);

/**
 * @route   POST /api/auth/google
 * @desc    Initiate Google OAuth
 * @access  Public
 */
router.post('/google', validate(googleAuthSchema), authController.googleAuth);

/**
 * @route   GET /api/auth/google/callback
 * @desc    Handle Google OAuth callback
 * @access  Public
 */
router.get('/google/callback', authController.googleCallback);

/**
 * @route   POST /api/auth/anonymous
 * @desc    Create anonymous session
 * @access  Public
 */
router.post('/anonymous', authController.anonymousAuth);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', validate(refreshTokenSchema), authController.refreshToken);

/**
 * @route   POST /api/auth/logout
 * @desc    Sign out user
 * @access  Private
 */
router.post('/logout', optionalAuthMiddleware, validate(logoutSchema), authController.logout);

export { router as authRouter };
