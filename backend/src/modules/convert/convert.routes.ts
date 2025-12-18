/**
 * Convert Module - Routes
 */

import { Router } from 'express';
import * as convertController from './convert.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { uploadSingle } from '../../middleware/upload.middleware';
import { validate } from '../../middleware/validate.middleware';
import { convertOptionsSchema } from './convert.types';

const router = Router();

// All convert routes require authentication
router.use(authMiddleware);

/**
 * @route   POST /api/convert/image
 * @desc    Convert image to PDF
 * @access  Private
 */
router.post(
    '/image',
    uploadSingle('file'),
    validate(convertOptionsSchema),
    convertController.convertImage
);

/**
 * @route   POST /api/convert/text
 * @desc    Convert text file to PDF
 * @access  Private
 */
router.post(
    '/text',
    uploadSingle('file'),
    validate(convertOptionsSchema),
    convertController.convertText
);

/**
 * @route   POST /api/convert/document
 * @desc    Convert DOC/DOCX to PDF
 * @access  Private
 */
router.post(
    '/document',
    uploadSingle('file'),
    validate(convertOptionsSchema),
    convertController.convertDocument
);

export { router as convertRouter };
