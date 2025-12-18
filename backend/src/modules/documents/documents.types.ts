/**
 * Documents Module - Types
 */

import { z } from 'zod';

// Validation Schemas
export const listDocumentsSchema = z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
    search: z.string().optional(),
    status: z.enum(['draft', 'published', 'archived']).optional(),
    sortBy: z.enum(['created_at', 'updated_at', 'file_name']).optional().default('created_at'),
    order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const getDocumentSchema = z.object({
    id: z.string().uuid('Invalid document ID'),
});

export const createDocumentSchema = z.object({
    fileName: z.string().min(1, 'File name is required'),
    fileSize: z.number().int().positive('File size must be positive'),
    fileType: z.string().min(1, 'File type is required'),
    storagePath: z.string().min(1, 'Storage path is required'),
});

export const updateDocumentSchema = z.object({
    fileName: z.string().min(1).optional(),
    status: z.enum(['draft', 'published', 'archived']).optional(),
    isPublic: z.boolean().optional(),
});

// Types derived from schemas
export type ListDocumentsInput = z.infer<typeof listDocumentsSchema>;
export type GetDocumentInput = z.infer<typeof getDocumentSchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
