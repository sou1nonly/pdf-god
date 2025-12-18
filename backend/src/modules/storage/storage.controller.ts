/**
 * Storage Module - Controller
 * HTTP request handlers for file storage
 */

import { Request, Response, NextFunction } from 'express';
import * as storageService from './storage.service';
import * as documentsService from '../documents/documents.service';
import { sendSuccess, sendError } from '../../shared/response';
import { getFileInfo } from '../../middleware/upload.middleware';
import type { UploadFileInput, GetSignedUrlInput } from './storage.types';

/**
 * POST /api/storage/upload
 * Upload a file and create document record
 */
export const uploadFile = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            sendError(res, 'AUTH_REQUIRED', 'Not authenticated', 401);
            return;
        }

        if (!req.file) {
            sendError(res, 'BAD_REQUEST', 'No file provided', 400);
            return;
        }

        const file = getFileInfo(req.file);
        const { folder } = req.body as UploadFileInput;

        // Upload to storage
        const uploaded = await storageService.uploadFile(
            req.user.id,
            {
                buffer: file.buffer,
                originalName: file.originalName,
                mimeType: file.mimeType,
                size: file.size,
            },
            folder || 'documents'
        );

        // Create document record
        const document = await documentsService.createDocument(req.user.id, {
            fileName: file.originalName,
            fileSize: file.size,
            fileType: file.mimeType,
            storagePath: uploaded.path,
        });

        sendSuccess(res, {
            document,
            storage: {
                path: uploaded.path,
                url: uploaded.url,
                size: uploaded.size,
            },
        }, 201);
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/storage/download/:path(*)
 * Download a file
 */
export const downloadFile = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            sendError(res, 'AUTH_REQUIRED', 'Not authenticated', 401);
            return;
        }

        const storagePath = req.params.path || req.params[0];

        if (!storagePath) {
            sendError(res, 'BAD_REQUEST', 'File path is required', 400);
            return;
        }

        // Verify user has access to this file
        // The path format is: {userId}/{folder}/{filename}
        const pathParts = storagePath.split('/');
        if (pathParts[0] !== req.user.id) {
            // Check if it's a public document they have access to
            // For now, only allow access to own files
            sendError(res, 'FORBIDDEN', 'Access denied', 403);
            return;
        }

        const { blob, contentType } = await storageService.downloadFile(storagePath);

        // Convert Blob to Buffer for response
        const buffer = Buffer.from(await blob.arrayBuffer());

        res.set({
            'Content-Type': contentType,
            'Content-Length': buffer.length,
            'Content-Disposition': `attachment; filename="${pathParts[pathParts.length - 1]}"`,
        });

        res.send(buffer);
    } catch (error) {
        next(error);
    }
};

/**
 * DELETE /api/storage/:path(*)
 * Delete a file
 */
export const deleteFile = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            sendError(res, 'AUTH_REQUIRED', 'Not authenticated', 401);
            return;
        }

        const storagePath = req.params.path || req.params[0];

        if (!storagePath) {
            sendError(res, 'BAD_REQUEST', 'File path is required', 400);
            return;
        }

        // Verify ownership
        const pathParts = storagePath.split('/');
        if (pathParts[0] !== req.user.id) {
            sendError(res, 'FORBIDDEN', 'Access denied', 403);
            return;
        }

        await storageService.deleteFile(storagePath);

        sendSuccess(res, { deleted: true });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/storage/signed-url/:path(*)
 * Get a signed URL for private file access
 */
export const getSignedUrl = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            sendError(res, 'AUTH_REQUIRED', 'Not authenticated', 401);
            return;
        }

        const storagePath = req.params.path || req.params[0];
        const { expiresIn } = req.query as unknown as GetSignedUrlInput;

        if (!storagePath) {
            sendError(res, 'BAD_REQUEST', 'File path is required', 400);
            return;
        }

        // Verify ownership or public access
        const pathParts = storagePath.split('/');
        if (pathParts[0] !== req.user.id) {
            sendError(res, 'FORBIDDEN', 'Access denied', 403);
            return;
        }

        const result = await storageService.getSignedUrl(storagePath, expiresIn || 3600);

        sendSuccess(res, result);
    } catch (error) {
        next(error);
    }
};
