/**
 * Authentication Middleware
 * Verifies JWT tokens and attaches user to request
 */

import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdmin } from '../config/supabase';
import type { User } from '../types';

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: User;
            accessToken?: string;
        }
    }
}

/**
 * Extract token from Authorization header
 */
const extractToken = (req: Request): string | null => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return null;
    }

    // Support "Bearer <token>" format
    if (authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    return authHeader;
};

/**
 * Authentication middleware
 * Verifies the JWT token and attaches user to request
 */
export const authMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const token = extractToken(req);

        if (!token) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'AUTH_REQUIRED',
                    message: 'Authentication required',
                },
            });
            return;
        }

        // Verify token with Supabase
        const supabase = getSupabaseAdmin();
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'AUTH_INVALID_TOKEN',
                    message: 'Invalid or expired token',
                },
            });
            return;
        }

        // Attach user to request
        req.user = {
            id: user.id,
            email: user.email || '',
            fullName: user.user_metadata?.full_name || null,
            avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
            isGuest: user.is_anonymous || false,
            createdAt: user.created_at,
            updatedAt: user.updated_at || user.created_at,
        };
        req.accessToken = token;

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Authentication failed',
            },
        });
    }
};

/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't require it
 */
export const optionalAuthMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const token = extractToken(req);

        if (token) {
            const supabase = getSupabaseAdmin();
            const { data: { user }, error } = await supabase.auth.getUser(token);

            if (!error && user) {
                req.user = {
                    id: user.id,
                    email: user.email || '',
                    fullName: user.user_metadata?.full_name || null,
                    avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
                    isGuest: user.is_anonymous || false,
                    createdAt: user.created_at,
                    updatedAt: user.updated_at || user.created_at,
                };
                req.accessToken = token;
            }
        }

        next();
    } catch (error) {
        // Don't fail on optional auth errors
        console.warn('Optional auth middleware error:', error);
        next();
    }
};
