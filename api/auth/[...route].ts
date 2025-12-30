/**
 * Auth API Routes
 * /api/auth/[...route].ts
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../lib/supabase';
import { getUserFromRequest, User } from '../lib/auth';
import { sendSuccess, sendError, handleError } from '../lib/response';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Parse route from URL
    const route = req.query.route as string[] | undefined;
    const path = route ? route.join('/') : '';

    try {
        // GET /api/auth/me
        if (req.method === 'GET' && path === 'me') {
            const user = await getUserFromRequest(req);
            if (!user) {
                return sendError(res, 'AUTH_REQUIRED', 'Not authenticated', 401);
            }
            return sendSuccess(res, { user });
        }

        // POST /api/auth/anonymous
        if (req.method === 'POST' && path === 'anonymous') {
            const supabase = getSupabaseAdmin();
            const { data, error } = await supabase.auth.signInAnonymously();

            if (error || !data.session || !data.user) {
                return sendError(res, 'AUTH_ANONYMOUS_FAILED', 'Failed to create anonymous session', 500);
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

            return sendSuccess(res, {
                user,
                accessToken: data.session.access_token,
                refreshToken: data.session.refresh_token,
                expiresAt: data.session.expires_at || 0,
            }, 201);
        }

        // POST /api/auth/refresh
        if (req.method === 'POST' && path === 'refresh') {
            const { refreshToken } = req.body || {};
            if (!refreshToken) {
                return sendError(res, 'BAD_REQUEST', 'refreshToken is required', 400);
            }

            const supabase = getSupabaseAdmin();
            const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

            if (error || !data.session) {
                return sendError(res, 'AUTH_REFRESH_FAILED', 'Failed to refresh token', 401);
            }

            return sendSuccess(res, {
                accessToken: data.session.access_token,
                refreshToken: data.session.refresh_token,
                expiresAt: data.session.expires_at || 0,
            });
        }

        // POST /api/auth/logout
        if (req.method === 'POST' && path === 'logout') {
            // Supabase handles logout client-side, just acknowledge
            return sendSuccess(res, { message: 'Logged out successfully' });
        }

        // POST /api/auth/google
        if (req.method === 'POST' && path === 'google') {
            const body = req.body || {};
            const query = req.query || {};
            const redirectTo = (body.redirectTo as string) || (query.redirectTo as string);
            const code = (body.code as string) || (query.code as string);
            const supabase = getSupabaseAdmin();

            // If code provided, exchange for session
            if (code) {
                const { data, error } = await supabase.auth.exchangeCodeForSession(code);
                if (error || !data.session || !data.user) {
                    return sendError(res, 'AUTH_OAUTH_FAILED', 'Failed to exchange code', 401);
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

                return sendSuccess(res, {
                    user,
                    accessToken: data.session.access_token,
                    refreshToken: data.session.refresh_token,
                    expiresAt: data.session.expires_at || 0,
                });
            }

            // Return OAuth URL
            const { data } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectTo || '/',
                    queryParams: { access_type: 'offline', prompt: 'consent' },
                },
            });

            return sendSuccess(res, { url: data.url || '' });
        }

        return sendError(res, 'NOT_FOUND', `Route not found: ${path}`, 404);
    } catch (error) {
        return handleError(res, error);
    }
}
