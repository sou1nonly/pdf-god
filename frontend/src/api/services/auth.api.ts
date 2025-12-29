/**
 * Auth API Service
 * Frontend API calls for authentication
 */

import { api, storeTokens, clearTokens, getRefreshToken } from '../client';
import type { User } from '@/types';

export interface AuthResponse {
    user: User;
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
}

export interface CurrentUserResponse {
    user: User;
}

export interface GoogleAuthUrlResponse {
    url: string;
}

/**
 * Get current authenticated user
 */
export const getCurrentUser = async (): Promise<User> => {
    const { user } = await api.get<CurrentUserResponse>('/auth/me');
    return user;
};

/**
 * Get Google OAuth URL
 */
export const getGoogleAuthUrl = async (redirectTo?: string): Promise<string> => {
    const { url } = await api.post<GoogleAuthUrlResponse>('/auth/google', { redirectTo }, { skipAuth: true });
    return url;
};

/**
 * Exchange Google OAuth code for session
 */
export const exchangeGoogleCode = async (code: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>(`/auth/google?code=${encodeURIComponent(code)}`, {}, { skipAuth: true });
    storeTokens(response.accessToken, response.refreshToken);
    return response;
};

/**
 * Sign in anonymously
 */
export const signInAnonymously = async (): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/anonymous', {}, { skipAuth: true });
    storeTokens(response.accessToken, response.refreshToken);
    return response;
};

/**
 * Refresh access token
 */
export const refreshAccessToken = async (): Promise<{ accessToken: string; refreshToken: string; expiresAt: number }> => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
        throw new Error('No refresh token available');
    }

    const response = await api.post<{ accessToken: string; refreshToken: string; expiresAt: number }>(
        '/auth/refresh',
        { refreshToken },
        { skipAuth: true }
    );

    storeTokens(response.accessToken, response.refreshToken);
    return response;
};

/**
 * Sign out
 */
export const signOut = async (): Promise<void> => {
    try {
        await api.post('/auth/logout');
    } finally {
        clearTokens();
    }
};

export const authApi = {
    getCurrentUser,
    getGoogleAuthUrl,
    exchangeGoogleCode,
    signInAnonymously,
    refreshAccessToken,
    signOut,
};

export default authApi;
