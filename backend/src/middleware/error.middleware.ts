/**
 * Error Handling Middleware
 * Global error handler for Express
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';
import type { ApiResponse } from '../types';

/**
 * Custom API Error class
 */
export class ApiError extends Error {
    constructor(
        public statusCode: number,
        public code: string,
        message: string,
        public details?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'ApiError';
    }

    static badRequest(message: string, code = 'BAD_REQUEST', details?: Record<string, unknown>) {
        return new ApiError(400, code, message, details);
    }

    static unauthorized(message = 'Unauthorized', code = 'AUTH_REQUIRED') {
        return new ApiError(401, code, message);
    }

    static forbidden(message = 'Forbidden', code = 'FORBIDDEN') {
        return new ApiError(403, code, message);
    }

    static notFound(message = 'Not found', code = 'NOT_FOUND') {
        return new ApiError(404, code, message);
    }

    static internal(message = 'Internal server error', code = 'INTERNAL_ERROR') {
        return new ApiError(500, code, message);
    }
}

/**
 * Format Zod validation errors
 */
const formatZodError = (error: ZodError): Record<string, string[]> => {
    const formatted: Record<string, string[]> = {};

    for (const issue of error.errors) {
        const path = issue.path.join('.');
        if (!formatted[path]) {
            formatted[path] = [];
        }
        formatted[path].push(issue.message);
    }

    return formatted;
};

/**
 * Global error handling middleware
 */
export const errorMiddleware = (
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
): void => {
    console.error('Error:', err);

    // Handle Zod validation errors
    if (err instanceof ZodError) {
        const response: ApiResponse = {
            success: false,
            error: {
                code: 'VALIDATION_FAILED',
                message: 'Validation failed',
                details: formatZodError(err),
            },
        };
        res.status(400).json(response);
        return;
    }

    // Handle custom API errors
    if (err instanceof ApiError) {
        const response: ApiResponse = {
            success: false,
            error: {
                code: err.code,
                message: err.message,
                details: err.details,
            },
        };
        res.status(err.statusCode).json(response);
        return;
    }

    // Handle unknown errors
    const response: ApiResponse = {
        success: false,
        error: {
            code: 'INTERNAL_ERROR',
            message: env.isDev ? err.message : 'Internal server error',
            details: env.isDev ? { stack: err.stack } : undefined,
        },
    };
    res.status(500).json(response);
};

/**
 * 404 Not Found handler
 */
export const notFoundMiddleware = (req: Request, res: Response): void => {
    const response: ApiResponse = {
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: `Route ${req.method} ${req.path} not found`,
        },
    };
    res.status(404).json(response);
};
