/**
 * Auth utilities for Vercel Functions
 */

import type { VercelRequest } from '@vercel/node';
import { getSupabaseAdmin } from './supabase';

export interface User {
    id: string;
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
    isGuest: boolean;
    createdAt: string;
    updatedAt: string;
}

/**
 * Get user from Authorization header
 */
export const getUserFromRequest = async (req: VercelRequest): Promise<User | null> => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.substring(7);

    try {
        const supabase = getSupabaseAdmin();
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return null;
        }

        return {
            id: user.id,
            email: user.email || '',
            fullName: user.user_metadata?.full_name || null,
            avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
            isGuest: user.is_anonymous || false,
            createdAt: user.created_at,
            updatedAt: user.updated_at || user.created_at,
        };
    } catch {
        return null;
    }
};

/**
 * Require authentication (throws if not authenticated)
 */
export const requireAuth = async (req: VercelRequest): Promise<User> => {
    const user = await getUserFromRequest(req);
    if (!user) {
        throw { code: 'AUTH_REQUIRED', message: 'Not authenticated', status: 401 };
    }
    return user;
};
