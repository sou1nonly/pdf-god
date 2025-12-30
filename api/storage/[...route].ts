/**
 * Storage API Routes
 * /api/storage/[...route].ts
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../lib/supabase';
import { requireAuth } from '../lib/auth';
import { sendSuccess, sendError, handleError } from '../lib/response';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '4.5mb',
        },
    },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const route = req.query.route as string[] | undefined;
    const action = route?.[0] || '';
    const pathParam = route?.slice(1).join('/') || '';

    try {
        const user = await requireAuth(req);
        const supabase = getSupabaseAdmin();

        // POST /api/storage/upload
        if (req.method === 'POST' && action === 'upload') {
            // For Vercel, we'll use direct Supabase upload from frontend
            // This endpoint creates the document record after frontend uploads to Supabase
            const { fileName, fileSize, fileType, storagePath, folder = 'documents' } = req.body || {};

            if (!fileName || !storagePath) {
                return sendError(res, 'BAD_REQUEST', 'fileName and storagePath are required', 400);
            }

            // Create document record
            const { data: document, error } = await supabase
                .from('documents')
                .insert({
                    user_id: user.id,
                    file_name: fileName,
                    file_size: fileSize || 0,
                    file_type: fileType || 'application/pdf',
                    storage_path: storagePath,
                    status: 'draft',
                    is_public: false,
                })
                .select()
                .single();

            if (error) {
                console.error('Error creating document:', error);
                throw { code: 'INTERNAL_ERROR', message: 'Failed to create document', status: 500 };
            }

            // Get public URL
            const { data: urlData } = supabase.storage.from(folder).getPublicUrl(storagePath);

            return sendSuccess(res, {
                document: {
                    id: document.id,
                    userId: document.user_id,
                    fileName: document.file_name,
                    fileSize: document.file_size,
                    fileType: document.file_type,
                    storagePath: document.storage_path,
                    status: document.status,
                    isPublic: document.is_public,
                    createdAt: document.created_at,
                    updatedAt: document.updated_at,
                },
                storage: {
                    path: storagePath,
                    url: urlData?.publicUrl || '',
                    size: fileSize || 0,
                },
            }, 201);
        }

        // GET /api/storage/signed-url/:path
        if (req.method === 'GET' && action === 'signed-url' && pathParam) {
            const { expiresIn = '3600' } = req.query as any;

            // Verify ownership
            const pathParts = pathParam.split('/');
            if (pathParts[0] !== user.id) {
                return sendError(res, 'FORBIDDEN', 'Access denied', 403);
            }

            const { data, error } = await supabase.storage
                .from('documents')
                .createSignedUrl(pathParam, parseInt(expiresIn));

            if (error) {
                throw { code: 'STORAGE_ERROR', message: 'Failed to create signed URL', status: 500 };
            }

            return sendSuccess(res, { url: data.signedUrl, expiresIn: parseInt(expiresIn) });
        }

        // GET /api/storage/download/:path
        if (req.method === 'GET' && action === 'download' && pathParam) {
            // Verify ownership
            const pathParts = pathParam.split('/');
            if (pathParts[0] !== user.id) {
                return sendError(res, 'FORBIDDEN', 'Access denied', 403);
            }

            const { data, error } = await supabase.storage.from('documents').download(pathParam);

            if (error || !data) {
                throw { code: 'STORAGE_ERROR', message: 'Failed to download file', status: 500 };
            }

            const buffer = Buffer.from(await data.arrayBuffer());
            const fileName = pathParts[pathParts.length - 1];

            res.setHeader('Content-Type', data.type || 'application/octet-stream');
            res.setHeader('Content-Length', buffer.length);
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            return res.send(buffer);
        }

        // DELETE /api/storage/:path
        if (req.method === 'DELETE' && pathParam) {
            // Verify ownership
            const fullPath = action === 'delete' ? pathParam : [action, pathParam].filter(Boolean).join('/');
            const pathParts = fullPath.split('/');
            if (pathParts[0] !== user.id) {
                return sendError(res, 'FORBIDDEN', 'Access denied', 403);
            }

            const { error } = await supabase.storage.from('documents').remove([fullPath]);

            if (error) {
                console.warn('Storage delete error:', error);
            }

            return sendSuccess(res, { deleted: true });
        }

        return sendError(res, 'NOT_FOUND', 'Route not found', 404);
    } catch (error) {
        return handleError(res, error);
    }
}
