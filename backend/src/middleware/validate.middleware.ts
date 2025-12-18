/**
 * Validation Middleware
 * Zod schema validation for request body, params, and query
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

type ValidationType = 'body' | 'params' | 'query';

/**
 * Create validation middleware for a Zod schema
 */
export const validate = (
    schema: ZodSchema,
    type: ValidationType = 'body'
) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const dataToValidate = req[type];
            const validated = await schema.parseAsync(dataToValidate);

            // Replace with validated data (handles transformations)
            req[type] = validated;

            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const errors = error.errors.map(e => ({
                    field: e.path.join('.'),
                    message: e.message,
                }));

                res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_FAILED',
                        message: 'Request validation failed',
                        details: { errors },
                    },
                });
                return;
            }

            next(error);
        }
    };
};

/**
 * Validate multiple parts of the request
 */
export const validateRequest = (schemas: {
    body?: ZodSchema;
    params?: ZodSchema;
    query?: ZodSchema;
}) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            if (schemas.body) {
                req.body = await schemas.body.parseAsync(req.body);
            }
            if (schemas.params) {
                req.params = await schemas.params.parseAsync(req.params);
            }
            if (schemas.query) {
                req.query = await schemas.query.parseAsync(req.query);
            }

            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const errors = error.errors.map(e => ({
                    field: e.path.join('.'),
                    message: e.message,
                }));

                res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_FAILED',
                        message: 'Request validation failed',
                        details: { errors },
                    },
                });
                return;
            }

            next(error);
        }
    };
};
