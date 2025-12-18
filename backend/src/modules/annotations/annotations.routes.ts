/**
 * Annotations Module - Routes
 * These routes are nested under /api/documents/:documentId
 */

import { Router } from 'express';
import * as annotationsController from './annotations.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate, validateRequest } from '../../middleware/validate.middleware';
import {
    getAnnotationsSchema,
    getPageAnnotationsSchema,
    saveAnnotationsSchema,
} from './annotations.types';

// mergeParams allows access to :documentId from parent router
const router = Router({ mergeParams: true });

// All routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/documents/:documentId/annotations
 * @desc    Get all annotations for a document
 * @access  Private
 */
router.get('/', annotationsController.getAnnotations);

/**
 * @route   GET /api/documents/:documentId/annotations/:pageNumber
 * @desc    Get annotations for a specific page
 * @access  Private
 */
router.get('/:pageNumber', annotationsController.getPageAnnotations);

/**
 * @route   POST /api/documents/:documentId/annotations
 * @desc    Save annotations for a page
 * @access  Private
 */
router.post(
    '/',
    validate(saveAnnotationsSchema),
    annotationsController.saveAnnotations
);

/**
 * @route   DELETE /api/documents/:documentId/annotations/:pageNumber
 * @desc    Delete annotations for a specific page
 * @access  Private
 */
router.delete('/:pageNumber', annotationsController.deletePageAnnotations);

/**
 * @route   DELETE /api/documents/:documentId/annotations
 * @desc    Delete all annotations for a document
 * @access  Private
 */
router.delete('/', annotationsController.deleteDocumentAnnotations);

export { router as annotationsRouter };
