/**
 * Auth Module - Service
 * Business logic for authentication
 */

import { getSupabaseAdmin } from '../../config/supabase';
import { ApiError } from '../../middleware/error.middleware';
import type { User } from '../../types';

/**
 * Get user by Supabase access token
 */
export const getUserByToken = async (accessToken: string): Promise<User> => {
    const supabase = getSupabaseAdmin();

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
        throw ApiError.unauthorized('Invalid or expired token', 'AUTH_INVALID_TOKEN');
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
};

/**
 * Sign in anonymously
 */
export const signInAnonymously = async (): Promise<{
    user: User;
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
}> => {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.auth.signInAnonymously();

    if (error || !data.session || !data.user) {
        throw ApiError.internal('Failed to create anonymous session', 'AUTH_ANONYMOUS_FAILED');
    }

    const user: User = {
        id: data.user.id,
        email: data.user.email || '',
        fullName: null,
        avatarUrl: null,
        isGuest: true,
        createdAt: data.user.created_at,
        updatedAt: data.user.updated_at || data.user.created_at,
    };

    return {
        user,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at || 0,
    };
};

/**
 * Refresh access token
 */
export const refreshAccessToken = async (refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
}> => {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
    });

    if (error || !data.session) {
        throw ApiError.unauthorized('Failed to refresh token', 'AUTH_REFRESH_FAILED');
    }

    return {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at || 0,
    };
};

/**
 * Sign out user
 */
export const signOut = async (accessToken?: string): Promise<void> => {
    if (!accessToken) return;

    const supabase = getSupabaseAdmin();

    // Note: signOut with admin client doesn't actually invalidate tokens
    // but we call it for consistency
    await supabase.auth.admin.signOut(accessToken);
};

/**
 * Get Google OAuth URL for frontend redirect
 */
export const getGoogleAuthUrl = async (redirectTo: string): Promise<string> => {
    const supabase = getSupabaseAdmin();

    const { data } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo,
            queryParams: {
                access_type: 'offline',
                prompt: 'consent',
            },
        },
    });

    return data.url || '';
};

/**
 * Exchange authorization code for session (for OAuth callback)
 */
export const exchangeCodeForSession = async (code: string): Promise<{
    user: User;
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
}> => {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.session || !data.user) {
        throw ApiError.unauthorized('Failed to exchange code for session', 'AUTH_OAUTH_FAILED');
    }

    const user: User = {
        id: data.user.id,
        email: data.user.email || '',
        fullName: data.user.user_metadata?.full_name || null,
        avatarUrl: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture || null,
        isGuest: false,
        createdAt: data.user.created_at,
        updatedAt: data.user.updated_at || data.user.created_at,
    };

    return {
        user,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at || 0,
    };
};
