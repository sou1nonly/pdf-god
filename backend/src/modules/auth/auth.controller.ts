/**
 * Auth Module - Controller
 * HTTP request handlers for authentication
 */

import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { sendSuccess, sendError } from '../../shared/response';
import type { GoogleAuthInput, RefreshTokenInput } from './auth.types';

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
export const getCurrentUser = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            sendError(res, 'AUTH_REQUIRED', 'Not authenticated', 401);
            return;
        }

        sendSuccess(res, { user: req.user });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/auth/google
 * Initiate Google OAuth or exchange code for session
 */
export const googleAuth = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { redirectTo } = req.body as GoogleAuthInput;

        // If code is provided in query, exchange it for session
        const code = req.query.code as string;
        if (code) {
            const result = await authService.exchangeCodeForSession(code);
            sendSuccess(res, result);
            return;
        }

        // Otherwise, return the OAuth URL for frontend to redirect
        const authUrl = authService.getGoogleAuthUrl(redirectTo || '/');
        sendSuccess(res, { url: authUrl });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/auth/google/callback
 * Handle Google OAuth callback
 */
export const googleCallback = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const code = req.query.code as string;

        if (!code) {
            sendError(res, 'AUTH_INVALID_REQUEST', 'Authorization code is required', 400);
            return;
        }

        const result = await authService.exchangeCodeForSession(code);
        sendSuccess(res, result);
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/auth/anonymous
 * Create anonymous session
 */
export const anonymousAuth = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const result = await authService.signInAnonymously();
        sendSuccess(res, result, 201);
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
export const refreshToken = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { refreshToken } = req.body as RefreshTokenInput;

        const result = await authService.refreshAccessToken(refreshToken);
        sendSuccess(res, result);
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/auth/logout
 * Sign out user
 */
export const logout = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        await authService.signOut(req.accessToken);
        sendSuccess(res, { message: 'Logged out successfully' });
    } catch (error) {
        next(error);
    }
};
