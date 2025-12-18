/**
 * Annotations Module - Types
 */

import { z } from 'zod';

// Validation Schemas
export const getAnnotationsSchema = z.object({
    documentId: z.string().uuid('Invalid document ID'),
});

export const getPageAnnotationsSchema = z.object({
    documentId: z.string().uuid('Invalid document ID'),
    pageNumber: z.coerce.number().int().nonnegative(),
});

export const saveAnnotationsSchema = z.object({
    pageNumber: z.number().int().nonnegative('Page number must be non-negative'),
    type: z.enum(['comment', 'highlight', 'text', 'drawing', 'shape']).default('drawing'),
    content: z.object({
        objects: z.array(z.any()),
        version: z.string().optional().default('5.3.0'),
    }),
});

export const deleteAnnotationsSchema = z.object({
    documentId: z.string().uuid('Invalid document ID'),
    pageNumber: z.coerce.number().int().nonnegative().optional(),
});

// Types
export type GetAnnotationsInput = z.infer<typeof getAnnotationsSchema>;
export type GetPageAnnotationsInput = z.infer<typeof getPageAnnotationsSchema>;
export type SaveAnnotationsInput = z.infer<typeof saveAnnotationsSchema>;
export type DeleteAnnotationsInput = z.infer<typeof deleteAnnotationsSchema>;
