/**
 * Response utilities for Vercel Functions
 */

import type { VercelResponse } from '@vercel/node';

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: { code: string; message: string };
}

export const sendSuccess = <T>(res: VercelResponse, data: T, status = 200): void => {
    res.status(status).json({ success: true, data });
};

export const sendError = (res: VercelResponse, code: string, message: string, status = 400): void => {
    res.status(status).json({ success: false, error: { code, message } });
};

export const sendPaginated = <T>(
    res: VercelResponse,
    items: T[],
    total: number,
    page: number,
    limit: number
): void => {
    const totalPages = Math.ceil(total / limit);
    res.status(200).json({
        success: true,
        data: {
            items,
            total,
            page,
            limit,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        },
    });
};

export const handleError = (res: VercelResponse, error: any): void => {
    console.error('API Error:', error);

    if (error?.code && error?.message && error?.status) {
        sendError(res, error.code, error.message, error.status);
        return;
    }

    if (error instanceof Error) {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
        return;
    }

    sendError(res, 'INTERNAL_ERROR', 'An unexpected error occurred', 500);
};
