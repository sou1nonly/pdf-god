/**
 * Storage Module - Service
 * Business logic for file storage operations
 */

import { getSupabaseAdmin } from '../../config/supabase';
import { ApiError } from '../../middleware/error.middleware';

const BUCKET_NAME = 'documents';

/**
 * Upload a file to storage
 */
export const uploadFile = async (
    userId: string,
    file: {
        buffer: Buffer;
        originalName: string;
        mimeType: string;
        size: number;
    },
    folder: string = 'documents'
): Promise<{ path: string; url: string; size: number }> => {
    const supabase = getSupabaseAdmin();

    // Generate unique file path
    const fileId = crypto.randomUUID();
    const extension = file.originalName.split('.').pop() || '';
    const fileName = `${fileId}.${extension}`;
    const storagePath = `${userId}/${folder}/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, file.buffer, {
            contentType: file.mimeType,
            upsert: false,
        });

    if (error) {
        console.error('Storage upload error:', error);
        throw ApiError.internal('Failed to upload file', 'STORAGE_UPLOAD_FAILED');
    }

    // Get signed URL for private bucket access (1 hour expiry)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(storagePath, 3600); // 1 hour expiry

    if (signedUrlError || !signedUrlData) {
        console.error('Signed URL error:', signedUrlError);
        // Still return the path, URL can be generated on-demand
    }

    return {
        path: storagePath,
        url: signedUrlData?.signedUrl || '', // Use signed URL, empty if failed
        size: file.size,
    };
};

/**
 * Download a file from storage
 */
export const downloadFile = async (
    storagePath: string
): Promise<{ blob: Blob; contentType: string }> => {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .download(storagePath);

    if (error || !data) {
        console.error('Storage download error:', error);
        throw ApiError.notFound('File not found', 'STORAGE_FILE_NOT_FOUND');
    }

    return {
        blob: data,
        contentType: data.type || 'application/octet-stream',
    };
};

/**
 * Delete a file from storage
 */
export const deleteFile = async (storagePath: string): Promise<void> => {
    const supabase = getSupabaseAdmin();

    const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([storagePath]);

    if (error) {
        console.error('Storage delete error:', error);
        throw ApiError.internal('Failed to delete file');
    }
};

/**
 * Get a signed URL for private file access
 */
export const getSignedUrl = async (
    storagePath: string,
    expiresIn: number = 3600
): Promise<{ signedUrl: string; expiresAt: number }> => {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(storagePath, expiresIn);

    if (error || !data) {
        console.error('Signed URL error:', error);
        throw ApiError.notFound('File not found', 'STORAGE_FILE_NOT_FOUND');
    }

    return {
        signedUrl: data.signedUrl,
        expiresAt: Date.now() + (expiresIn * 1000),
    };
};

/**
 * Get public URL for a file
 */
export const getPublicUrl = (storagePath: string): string => {
    const supabase = getSupabaseAdmin();

    const { data } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath);

    return data.publicUrl;
};

/**
 * Check if a file exists
 */
export const fileExists = async (storagePath: string): Promise<boolean> => {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list(storagePath.split('/').slice(0, -1).join('/'), {
            limit: 1,
            search: storagePath.split('/').pop(),
        });

    return !error && data && data.length > 0;
};
