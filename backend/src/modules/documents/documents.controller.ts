/**
 * Documents Module - Controller
 * HTTP request handlers for document management
 */

import { Request, Response, NextFunction } from 'express';
import * as documentsService from './documents.service';
import * as storageService from '../storage/storage.service';
import { sendSuccess, sendPaginated, sendError } from '../../shared/response';
import type { ListDocumentsInput, CreateDocumentInput, UpdateDocumentInput } from './documents.types';

/**
 * GET /api/documents
 * List user's documents with pagination
 */
export const listDocuments = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            sendError(res, 'AUTH_REQUIRED', 'Not authenticated', 401);
            return;
        }

        const params = req.query as unknown as ListDocumentsInput;
        const { documents, total } = await documentsService.listDocuments(req.user.id, params);

        sendPaginated(
            res,
            documents,
            total,
            params.page || 1,
            params.limit || 20
        );
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/documents/:id
 * Get a single document by ID
 */
export const getDocument = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            sendError(res, 'AUTH_REQUIRED', 'Not authenticated', 401);
            return;
        }

        const document = await documentsService.getDocument(req.params.id, req.user.id);
        sendSuccess(res, { document });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/documents
 * Create a new document record
 */
export const createDocument = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            sendError(res, 'AUTH_REQUIRED', 'Not authenticated', 401);
            return;
        }

        const input = req.body as CreateDocumentInput;
        const document = await documentsService.createDocument(req.user.id, input);

        sendSuccess(res, { document }, 201);
    } catch (error) {
        next(error);
    }
};

/**
 * PATCH /api/documents/:id
 * Update a document
 */
export const updateDocument = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            sendError(res, 'AUTH_REQUIRED', 'Not authenticated', 401);
            return;
        }

        const input = req.body as UpdateDocumentInput;
        const document = await documentsService.updateDocument(req.params.id, req.user.id, input);

        sendSuccess(res, { document });
    } catch (error) {
        next(error);
    }
};

/**
 * DELETE /api/documents/:id
 * Delete a document and its storage file
 */
export const deleteDocument = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            sendError(res, 'AUTH_REQUIRED', 'Not authenticated', 401);
            return;
        }

        const { storagePath } = await documentsService.deleteDocument(req.params.id, req.user.id);

        // Also delete the file from storage
        try {
            await storageService.deleteFile(storagePath);
        } catch (storageError) {
            console.warn('Failed to delete file from storage:', storageError);
            // Don't fail the request if storage deletion fails
        }

        sendSuccess(res, { deleted: true });
    } catch (error) {
        next(error);
    }
};
