/**
 * Documents Module - Routes
 * Express router for document endpoints
 */

import { Router } from 'express';
import * as documentsController from './documents.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate, validateRequest } from '../../middleware/validate.middleware';
import {
    listDocumentsSchema,
    getDocumentSchema,
    createDocumentSchema,
    updateDocumentSchema,
} from './documents.types';

const router = Router();

// All document routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/documents
 * @desc    List user's documents
 * @access  Private
 */
router.get(
    '/',
    validate(listDocumentsSchema, 'query'),
    documentsController.listDocuments
);

/**
 * @route   GET /api/documents/:id
 * @desc    Get a single document
 * @access  Private
 */
router.get(
    '/:id',
    validate(getDocumentSchema, 'params'),
    documentsController.getDocument
);

/**
 * @route   POST /api/documents
 * @desc    Create a new document record
 * @access  Private
 */
router.post(
    '/',
    validate(createDocumentSchema),
    documentsController.createDocument
);

/**
 * @route   PATCH /api/documents/:id
 * @desc    Update a document
 * @access  Private
 */
router.patch(
    '/:id',
    validateRequest({
        params: getDocumentSchema,
        body: updateDocumentSchema,
    }),
    documentsController.updateDocument
);

/**
 * @route   DELETE /api/documents/:id
 * @desc    Delete a document
 * @access  Private
 */
router.delete(
    '/:id',
    validate(getDocumentSchema, 'params'),
    documentsController.deleteDocument
);

export { router as documentsRouter };
