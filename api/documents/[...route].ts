/**
 * Documents API Routes
 * /api/documents/[...route].ts
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../lib/supabase';
import { requireAuth } from '../lib/auth';
import { sendSuccess, sendError, sendPaginated, handleError } from '../lib/response';

interface Document {
    id: string;
    userId: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    storagePath: string;
    thumbnailUrl?: string | null;
    pageCount?: number;
    status: string;
    isPublic: boolean;
    createdAt: string;
    updatedAt: string;
}

const toCamelCase = (row: any): Document => ({
    id: row.id,
    userId: row.user_id,
    fileName: row.file_name,
    fileSize: row.file_size,
    fileType: row.file_type,
    storagePath: row.storage_path,
    thumbnailUrl: row.thumbnail_url,
    pageCount: row.page_count,
    status: row.status,
    isPublic: row.is_public,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const route = req.query.route as string[] | undefined;
    const documentId = route?.[0];
    const subResource = route?.[1]; // e.g., 'annotations'

    try {
        const user = await requireAuth(req);
        const supabase = getSupabaseAdmin();

        // Handle annotations sub-resource
        if (subResource === 'annotations') {
            return handleAnnotations(req, res, user.id, documentId!, route?.slice(2));
        }

        // GET /api/documents - List documents
        if (req.method === 'GET' && !documentId) {
            const { page = '1', limit = '20', search, status, sortBy = 'created_at', order = 'desc' } = req.query as any;
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const offset = (pageNum - 1) * limitNum;

            let query = supabase
                .from('documents')
                .select('*', { count: 'exact' })
                .eq('user_id', user.id);

            if (search) query = query.ilike('file_name', `%${search}%`);
            if (status) query = query.eq('status', status);

            query = query
                .order(sortBy, { ascending: order === 'asc' })
                .range(offset, offset + limitNum - 1);

            const { data, error, count } = await query;
            if (error) throw { code: 'INTERNAL_ERROR', message: 'Failed to fetch documents', status: 500 };

            return sendPaginated(res, (data || []).map(toCamelCase), count || 0, pageNum, limitNum);
        }

        // GET /api/documents/:id - Get single document
        if (req.method === 'GET' && documentId) {
            const { data, error } = await supabase
                .from('documents')
                .select('*')
                .eq('id', documentId)
                .single();

            if (error || !data) return sendError(res, 'NOT_FOUND', 'Document not found', 404);
            if (data.user_id !== user.id && !data.is_public) {
                return sendError(res, 'FORBIDDEN', 'Access denied', 403);
            }

            return sendSuccess(res, { document: toCamelCase(data) });
        }

        // POST /api/documents - Create document
        if (req.method === 'POST' && !documentId) {
            const { fileName, fileSize, fileType, storagePath } = req.body || {};

            const { data, error } = await supabase
                .from('documents')
                .insert({
                    user_id: user.id,
                    file_name: fileName,
                    file_size: fileSize,
                    file_type: fileType,
                    storage_path: storagePath,
                    status: 'draft',
                    is_public: false,
                })
                .select()
                .single();

            if (error) throw { code: 'INTERNAL_ERROR', message: 'Failed to create document', status: 500 };
            return sendSuccess(res, { document: toCamelCase(data) }, 201);
        }

        // PATCH /api/documents/:id - Update document
        if (req.method === 'PATCH' && documentId) {
            const { fileName, status, isPublic } = req.body || {};

            // Verify ownership
            const { data: existing } = await supabase
                .from('documents')
                .select('user_id')
                .eq('id', documentId)
                .single();

            if (!existing) return sendError(res, 'NOT_FOUND', 'Document not found', 404);
            if (existing.user_id !== user.id) return sendError(res, 'FORBIDDEN', 'Access denied', 403);

            const updateData: any = {};
            if (fileName !== undefined) updateData.file_name = fileName;
            if (status !== undefined) updateData.status = status;
            if (isPublic !== undefined) updateData.is_public = isPublic;

            const { data, error } = await supabase
                .from('documents')
                .update(updateData)
                .eq('id', documentId)
                .select()
                .single();

            if (error) throw { code: 'INTERNAL_ERROR', message: 'Failed to update document', status: 500 };
            return sendSuccess(res, { document: toCamelCase(data) });
        }

        // DELETE /api/documents/:id - Delete document
        if (req.method === 'DELETE' && documentId) {
            const { data: existing } = await supabase
                .from('documents')
                .select('user_id, storage_path')
                .eq('id', documentId)
                .single();

            if (!existing) return sendError(res, 'NOT_FOUND', 'Document not found', 404);
            if (existing.user_id !== user.id) return sendError(res, 'FORBIDDEN', 'Access denied', 403);

            // Delete from storage
            if (existing.storage_path) {
                await supabase.storage.from('documents').remove([existing.storage_path]);
            }

            const { error } = await supabase.from('documents').delete().eq('id', documentId);
            if (error) throw { code: 'INTERNAL_ERROR', message: 'Failed to delete document', status: 500 };

            return sendSuccess(res, { deleted: true });
        }

        return sendError(res, 'NOT_FOUND', 'Route not found', 404);
    } catch (error) {
        return handleError(res, error);
    }
}

// Handle annotations sub-routes: /api/documents/:id/annotations/*
async function handleAnnotations(
    req: VercelRequest,
    res: VercelResponse,
    userId: string,
    documentId: string,
    subRoute?: string[]
) {
    const supabase = getSupabaseAdmin();
    const pageNumber = subRoute?.[0] ? parseInt(subRoute[0]) : undefined;

    // GET /api/documents/:id/annotations
    if (req.method === 'GET' && !pageNumber) {
        const { data, error } = await supabase
            .from('annotations')
            .select('*')
            .eq('document_id', documentId)
            .eq('user_id', userId);

        if (error) throw { code: 'INTERNAL_ERROR', message: 'Failed to fetch annotations', status: 500 };

        const annotationsMap: Record<number, any> = {};
        for (const row of data || []) {
            annotationsMap[row.page_number] = {
                id: row.id,
                documentId: row.document_id,
                userId: row.user_id,
                pageNumber: row.page_number,
                type: row.type,
                content: row.content,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
            };
        }

        return sendSuccess(res, { annotations: annotationsMap });
    }

    // GET /api/documents/:id/annotations/:pageNumber
    if (req.method === 'GET' && pageNumber !== undefined) {
        const { data } = await supabase
            .from('annotations')
            .select('*')
            .eq('document_id', documentId)
            .eq('user_id', userId)
            .eq('page_number', pageNumber)
            .single();

        return sendSuccess(res, { annotation: data || null });
    }

    // POST /api/documents/:id/annotations
    if (req.method === 'POST') {
        const { pageNumber: pn, type, content } = req.body || {};

        const { data, error } = await supabase
            .from('annotations')
            .upsert({
                document_id: documentId,
                user_id: userId,
                page_number: pn,
                type,
                content,
            }, { onConflict: 'document_id,user_id,page_number' })
            .select()
            .single();

        if (error) throw { code: 'INTERNAL_ERROR', message: 'Failed to save annotations', status: 500 };
        return sendSuccess(res, { annotation: data });
    }

    // DELETE /api/documents/:id/annotations/:pageNumber
    if (req.method === 'DELETE' && pageNumber !== undefined) {
        const { error, count } = await supabase
            .from('annotations')
            .delete()
            .eq('document_id', documentId)
            .eq('user_id', userId)
            .eq('page_number', pageNumber);

        if (error) throw { code: 'INTERNAL_ERROR', message: 'Failed to delete annotations', status: 500 };
        return sendSuccess(res, { deleted: true, count });
    }

    // DELETE /api/documents/:id/annotations
    if (req.method === 'DELETE' && !pageNumber) {
        const { error, count } = await supabase
            .from('annotations')
            .delete()
            .eq('document_id', documentId)
            .eq('user_id', userId);

        if (error) throw { code: 'INTERNAL_ERROR', message: 'Failed to delete annotations', status: 500 };
        return sendSuccess(res, { deleted: true, count });
    }

    return sendError(res, 'NOT_FOUND', 'Route not found', 404);
}
