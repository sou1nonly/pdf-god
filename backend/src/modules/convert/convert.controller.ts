/**
 * Convert Module - Controller
 */

import { Request, Response, NextFunction } from 'express';
import * as convertService from './convert.service';
import { sendSuccess, sendError } from '../../shared/response';
import { getFileInfo } from '../../middleware/upload.middleware';
import type { ConvertOptions } from './convert.types';

/**
 * POST /api/convert/image
 * Convert image to PDF
 */
export const convertImage = async (
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
        const options = req.body as ConvertOptions;

        // Check if it's an image
        if (!file.mimeType.startsWith('image/')) {
            sendError(res, 'INVALID_FILE_TYPE', 'File must be an image', 400);
            return;
        }

        const pdfBuffer = await convertService.convertImageToPdf(
            file.buffer,
            file.mimeType,
            options
        );

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Length': pdfBuffer.length,
            'Content-Disposition': `attachment; filename="${file.originalName.replace(/\.[^/.]+$/, '')}.pdf"`,
        });

        res.send(pdfBuffer);
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/convert/text
 * Convert text file to PDF
 */
export const convertText = async (
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
        const options = req.body as ConvertOptions;

        // Check if it's a text file
        if (!['text/plain', 'application/rtf'].includes(file.mimeType)) {
            sendError(res, 'INVALID_FILE_TYPE', 'File must be plain text or RTF', 400);
            return;
        }

        const pdfBuffer = await convertService.convertTextToPdf(file.buffer, options);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Length': pdfBuffer.length,
            'Content-Disposition': `attachment; filename="${file.originalName.replace(/\.[^/.]+$/, '')}.pdf"`,
        });

        res.send(pdfBuffer);
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/convert/document
 * Convert DOC/DOCX to PDF
 */
export const convertDocument = async (
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
        const options = req.body as ConvertOptions;

        // Check if it's a document
        const docMimes = [
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.oasis.opendocument.text',
        ];

        if (!docMimes.includes(file.mimeType)) {
            sendError(res, 'INVALID_FILE_TYPE', 'File must be DOC, DOCX, or ODT', 400);
            return;
        }

        const pdfBuffer = await convertService.convertDocumentToPdf(
            file.buffer,
            file.mimeType,
            options
        );

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Length': pdfBuffer.length,
            'Content-Disposition': `attachment; filename="${file.originalName.replace(/\.[^/.]+$/, '')}.pdf"`,
        });

        res.send(pdfBuffer);
    } catch (error) {
        next(error);
    }
};
