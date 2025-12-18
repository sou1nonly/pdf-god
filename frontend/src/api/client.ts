/**
 * API Client
 * Base client for making API requests to the backend
 */

import type { ApiResponse } from '@unipdf/shared';

// API base URL from environment
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Token storage key
const TOKEN_KEY = 'unipdf-access-token';
const REFRESH_TOKEN_KEY = 'unipdf-refresh-token';

/**
 * Get stored access token
 */
export const getAccessToken = (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
};

/**
 * Set access token
 */
export const setAccessToken = (token: string): void => {
    localStorage.setItem(TOKEN_KEY, token);
};

/**
 * Get stored refresh token
 */
export const getRefreshToken = (): string | null => {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
};

/**
 * Set refresh token
 */
export const setRefreshToken = (token: string): void => {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
};

/**
 * Clear all tokens (logout)
 */
export const clearTokens = (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
};

/**
 * Store tokens from auth response
 */
export const storeTokens = (accessToken: string, refreshToken: string): void => {
    setAccessToken(accessToken);
    setRefreshToken(refreshToken);
};

/**
 * API Error class
 */
export class ApiError extends Error {
    constructor(
        public code: string,
        message: string,
        public statusCode: number,
        public details?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

/**
 * Request options
 */
interface RequestOptions extends Omit<RequestInit, 'body'> {
    body?: unknown;
    params?: Record<string, string | number | boolean | undefined>;
    skipAuth?: boolean;
}

/**
 * Build URL with query parameters
 */
const buildUrl = (path: string, params?: Record<string, string | number | boolean | undefined>): string => {
    const url = new URL(`${API_BASE_URL}${path}`);

    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined) {
                url.searchParams.append(key, String(value));
            }
        });
    }

    return url.toString();
};

/**
 * Make an API request
 */
export const apiRequest = async <T>(
    path: string,
    options: RequestOptions = {}
): Promise<T> => {
    const { body, params, skipAuth = false, ...fetchOptions } = options;

    // Build headers
    const headers: HeadersInit = {
        ...fetchOptions.headers,
    };

    // Add Content-Type for JSON body
    if (body && !(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    // Add Authorization header
    if (!skipAuth) {
        const token = getAccessToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }

    // Build request
    const url = buildUrl(path, params);
    const config: RequestInit = {
        ...fetchOptions,
        headers,
        body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    };

    try {
        const response = await fetch(url, config);

        // Handle non-JSON responses (like file downloads)
        const contentType = response.headers.get('Content-Type');
        if (contentType && !contentType.includes('application/json')) {
            if (!response.ok) {
                throw new ApiError('REQUEST_FAILED', `Request failed with status ${response.status}`, response.status);
            }
            return response as unknown as T;
        }

        // Parse JSON response
        const data: ApiResponse<T> = await response.json();

        // Handle API errors
        if (!data.success || data.error) {
            const error = data.error || { code: 'UNKNOWN_ERROR', message: 'An unknown error occurred' };
            throw new ApiError(error.code, error.message, response.status, error.details);
        }

        return data.data as T;
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }

        // Network or parsing error
        throw new ApiError(
            'NETWORK_ERROR',
            error instanceof Error ? error.message : 'Network request failed',
            0
        );
    }
};

/**
 * Convenience methods
 */
export const api = {
    get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
        apiRequest<T>(path, { ...options, method: 'GET' }),

    post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
        apiRequest<T>(path, { ...options, method: 'POST', body }),

    patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
        apiRequest<T>(path, { ...options, method: 'PATCH', body }),

    put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
        apiRequest<T>(path, { ...options, method: 'PUT', body }),

    delete: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
        apiRequest<T>(path, { ...options, method: 'DELETE' }),
};

export default api;
