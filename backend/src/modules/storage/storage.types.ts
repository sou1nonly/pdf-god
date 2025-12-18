/**
 * Storage Module - Types
 */

import { z } from 'zod';

// Validation Schemas
export const uploadFileSchema = z.object({
    // File is handled by multer, this validates any additional fields
    folder: z.string().optional().default('documents'),
});

export const getFileSchema = z.object({
    path: z.string().min(1, 'File path is required'),
});

export const deleteFileSchema = z.object({
    path: z.string().min(1, 'File path is required'),
});

export const getSignedUrlSchema = z.object({
    path: z.string().min(1, 'File path is required'),
    expiresIn: z.coerce.number().int().positive().optional().default(3600), // 1 hour default
});

// Types
export type UploadFileInput = z.infer<typeof uploadFileSchema>;
export type GetFileInput = z.infer<typeof getFileSchema>;
export type DeleteFileInput = z.infer<typeof deleteFileSchema>;
export type GetSignedUrlInput = z.infer<typeof getSignedUrlSchema>;
