/**
 * Documents Module - Service
 * Business logic for document management
 */

import { getSupabaseAdmin } from '../../config/supabase';
import { ApiError } from '../../middleware/error.middleware';
import type { Document } from '../../types';
import type { ListDocumentsInput, CreateDocumentInput, UpdateDocumentInput } from './documents.types';

// Helper to convert snake_case to camelCase
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

/**
 * List documents for a user with pagination
 */
export const listDocuments = async (
    userId: string,
    params: ListDocumentsInput
): Promise<{ documents: Document[]; total: number }> => {
    const supabase = getSupabaseAdmin();
    const { page, limit, search, status, sortBy, order } = params;

    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
        .from('documents')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

    // Apply filters
    if (search) {
        query = query.ilike('file_name', `%${search}%`);
    }

    if (status) {
        query = query.eq('status', status);
    }

    // Apply sorting and pagination
    query = query
        .order(sortBy === 'file_name' ? 'file_name' : sortBy, { ascending: order === 'asc' })
        .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
        console.error('Error listing documents:', error);
        throw ApiError.internal('Failed to fetch documents');
    }

    return {
        documents: (data || []).map(toCamelCase),
        total: count || 0,
    };
};

/**
 * Get a single document by ID
 */
export const getDocument = async (
    documentId: string,
    userId: string
): Promise<Document> => {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();

    if (error || !data) {
        throw ApiError.notFound('Document not found');
    }

    // Check ownership or public access
    if (data.user_id !== userId && !data.is_public) {
        throw ApiError.forbidden('Access denied to this document', 'DOCUMENT_ACCESS_DENIED');
    }

    return toCamelCase(data);
};

/**
 * Create a new document
 */
export const createDocument = async (
    userId: string,
    input: CreateDocumentInput
): Promise<Document> => {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
        .from('documents')
        .insert({
            user_id: userId,
            file_name: input.fileName,
            file_size: input.fileSize,
            file_type: input.fileType,
            storage_path: input.storagePath,
            status: 'draft',
            is_public: false,
        })
        .select()
        .single();

    if (error || !data) {
        console.error('Error creating document:', error);
        throw ApiError.internal('Failed to create document');
    }

    return toCamelCase(data);
};

/**
 * Update a document
 */
export const updateDocument = async (
    documentId: string,
    userId: string,
    input: UpdateDocumentInput
): Promise<Document> => {
    const supabase = getSupabaseAdmin();

    // First verify ownership
    const { data: existing } = await supabase
        .from('documents')
        .select('user_id')
        .eq('id', documentId)
        .single();

    if (!existing) {
        throw ApiError.notFound('Document not found');
    }

    if (existing.user_id !== userId) {
        throw ApiError.forbidden('Access denied to this document', 'DOCUMENT_ACCESS_DENIED');
    }

    // Build update object
    const updateData: any = {};
    if (input.fileName !== undefined) updateData.file_name = input.fileName;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.isPublic !== undefined) updateData.is_public = input.isPublic;

    const { data, error } = await supabase
        .from('documents')
        .update(updateData)
        .eq('id', documentId)
        .select()
        .single();

    if (error || !data) {
        console.error('Error updating document:', error);
        throw ApiError.internal('Failed to update document');
    }

    return toCamelCase(data);
};

/**
 * Delete a document
 */
export const deleteDocument = async (
    documentId: string,
    userId: string
): Promise<{ storagePath: string }> => {
    const supabase = getSupabaseAdmin();

    // First get the document to verify ownership and get storage path
    const { data: existing } = await supabase
        .from('documents')
        .select('user_id, storage_path')
        .eq('id', documentId)
        .single();

    if (!existing) {
        throw ApiError.notFound('Document not found');
    }

    if (existing.user_id !== userId) {
        throw ApiError.forbidden('Access denied to this document', 'DOCUMENT_ACCESS_DENIED');
    }

    // Delete from database
    const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

    if (error) {
        console.error('Error deleting document:', error);
        throw ApiError.internal('Failed to delete document');
    }

    return { storagePath: existing.storage_path };
};
