/**
 * Annotations Module - Controller
 */

import { Request, Response, NextFunction } from 'express';
import * as annotationsService from './annotations.service';
import { sendSuccess, sendError } from '../../shared/response';
import type { SaveAnnotationsInput } from './annotations.types';

/**
 * GET /api/documents/:documentId/annotations
 * Get all annotations for a document
 */
export const getAnnotations = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            sendError(res, 'AUTH_REQUIRED', 'Not authenticated', 401);
            return;
        }

        const { documentId } = req.params;
        const annotations = await annotationsService.getAnnotations(documentId, req.user.id);

        sendSuccess(res, { annotations });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/documents/:documentId/annotations/:pageNumber
 * Get annotations for a specific page
 */
export const getPageAnnotations = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            sendError(res, 'AUTH_REQUIRED', 'Not authenticated', 401);
            return;
        }

        const { documentId, pageNumber } = req.params;
        const annotation = await annotationsService.getPageAnnotations(
            documentId,
            req.user.id,
            parseInt(pageNumber, 10)
        );

        sendSuccess(res, { annotation });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/documents/:documentId/annotations
 * Save annotations for a page
 */
export const saveAnnotations = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            sendError(res, 'AUTH_REQUIRED', 'Not authenticated', 401);
            return;
        }

        const { documentId } = req.params;
        const { pageNumber, type, content } = req.body as SaveAnnotationsInput;

        const annotation = await annotationsService.saveAnnotations(
            documentId,
            req.user.id,
            pageNumber,
            type,
            content
        );

        sendSuccess(res, { annotation });
    } catch (error) {
        next(error);
    }
};

/**
 * DELETE /api/documents/:documentId/annotations/:pageNumber
 * Delete annotations for a specific page
 */
export const deletePageAnnotations = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            sendError(res, 'AUTH_REQUIRED', 'Not authenticated', 401);
            return;
        }

        const { documentId, pageNumber } = req.params;
        const count = await annotationsService.deletePageAnnotations(
            documentId,
            req.user.id,
            parseInt(pageNumber, 10)
        );

        sendSuccess(res, { deleted: true, count });
    } catch (error) {
        next(error);
    }
};

/**
 * DELETE /api/documents/:documentId/annotations
 * Delete all annotations for a document
 */
export const deleteDocumentAnnotations = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            sendError(res, 'AUTH_REQUIRED', 'Not authenticated', 401);
            return;
        }

        const { documentId } = req.params;
        const count = await annotationsService.deleteDocumentAnnotations(documentId, req.user.id);

        sendSuccess(res, { deleted: true, count });
    } catch (error) {
        next(error);
    }
};
