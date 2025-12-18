/**
 * Storage Module - Routes
 */

import { Router } from 'express';
import * as storageController from './storage.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { uploadSingle } from '../../middleware/upload.middleware';
import { validate } from '../../middleware/validate.middleware';
import { uploadFileSchema, getSignedUrlSchema } from './storage.types';

const router = Router();

// All storage routes require authentication
router.use(authMiddleware);

/**
 * @route   POST /api/storage/upload
 * @desc    Upload a file
 * @access  Private
 */
router.post(
    '/upload',
    uploadSingle('file'),
    validate(uploadFileSchema),
    storageController.uploadFile
);

/**
 * @route   GET /api/storage/download/*
 * @desc    Download a file
 * @access  Private
 */
router.get('/download/*', storageController.downloadFile);

/**
 * @route   DELETE /api/storage/*
 * @desc    Delete a file
 * @access  Private
 */
router.delete('/*', storageController.deleteFile);

/**
 * @route   GET /api/storage/signed-url/*
 * @desc    Get signed URL for private access
 * @access  Private
 */
router.get(
    '/signed-url/*',
    validate(getSignedUrlSchema, 'query'),
    storageController.getSignedUrl
);

export { router as storageRouter };
