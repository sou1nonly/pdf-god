/**
 * Response Helpers
 * Utility functions for creating consistent API responses
 */

import { Response } from 'express';
import type { ApiResponse, PaginatedResponse } from '@lamina/shared';

/**
 * Send a success response
 */
export const sendSuccess = <T>(
    res: Response,
    data: T,
    statusCode: number = 200
): void => {
    const response: ApiResponse<T> = {
        success: true,
        data,
    };
    res.status(statusCode).json(response);
};

/**
 * Send a paginated success response
 */
export const sendPaginated = <T>(
    res: Response,
    items: T[],
    total: number,
    page: number,
    limit: number
): void => {
    const totalPages = Math.ceil(total / limit);

    const response: ApiResponse<PaginatedResponse<T>> = {
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
    };
    res.status(200).json(response);
};

/**
 * Send an error response
 */
export const sendError = (
    res: Response,
    code: string,
    message: string,
    statusCode: number = 400,
    details?: Record<string, unknown>
): void => {
    const response: ApiResponse = {
        success: false,
        error: {
            code,
            message,
            details,
        },
    };
    res.status(statusCode).json(response);
};

/**
 * Send a not found response
 */
export const sendNotFound = (
    res: Response,
    message: string = 'Resource not found'
): void => {
    sendError(res, 'NOT_FOUND', message, 404);
};

/**
 * Send an unauthorized response
 */
export const sendUnauthorized = (
    res: Response,
    message: string = 'Unauthorized'
): void => {
    sendError(res, 'AUTH_REQUIRED', message, 401);
};
