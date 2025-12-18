/**
 * File Upload Middleware
 * Multer configuration for handling file uploads
 */

import multer from 'multer';
import path from 'path';
import { env } from '../config/env';
import { ApiError } from './error.middleware';

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
    // PDF
    'application/pdf',

    // Documents
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/rtf',
    'application/vnd.oasis.opendocument.text',

    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/tiff',
    'image/webp',
];

// Allowed extensions
const ALLOWED_EXTENSIONS = [
    '.pdf',
    '.doc', '.docx',
    '.txt', '.rtf', '.odt',
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp',
];

// File filter function
const fileFilter: multer.Options['fileFilter'] = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mimeType = file.mimetype.toLowerCase();

    // Check extension
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        cb(new ApiError(400, 'INVALID_FILE_TYPE', `File extension ${ext} is not allowed`));
        return;
    }

    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        cb(new ApiError(400, 'INVALID_FILE_TYPE', `MIME type ${mimeType} is not allowed`));
        return;
    }

    cb(null, true);
};

// Memory storage (files stored in memory as Buffer)
const storage = multer.memoryStorage();

/**
 * Multer upload middleware
 */
export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: env.upload.maxFileSizeBytes,
        files: 5, // Max 5 files per request
    },
});

/**
 * Single file upload middleware
 */
export const uploadSingle = (fieldName: string = 'file') => {
    return upload.single(fieldName);
};

/**
 * Multiple files upload middleware
 */
export const uploadMultiple = (fieldName: string = 'files', maxCount: number = 5) => {
    return upload.array(fieldName, maxCount);
};

/**
 * Get file info from multer file
 */
export const getFileInfo = (file: Express.Multer.File) => ({
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    buffer: file.buffer,
    extension: path.extname(file.originalname).toLowerCase(),
});
