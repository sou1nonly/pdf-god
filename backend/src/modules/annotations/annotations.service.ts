/**
 * Annotations Module - Service
 * Business logic for annotation management
 */

import { getSupabaseAdmin } from '../../config/supabase';
import { ApiError } from '../../middleware/error.middleware';
import type { Annotation, AnnotationType, AnnotationContent } from '@lamina/shared';

// Helper to convert database row to Annotation
const toAnnotation = (row: any): Annotation => ({
    id: row.id,
    documentId: row.document_id,
    userId: row.user_id,
    pageNumber: row.page_number,
    type: row.type,
    content: row.content,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});

/**
 * Get all annotations for a document
 */
export const getAnnotations = async (
    documentId: string,
    userId: string
): Promise<Record<number, Annotation>> => {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
        .from('annotations')
        .select('*')
        .eq('document_id', documentId)
        .eq('user_id', userId)
        .eq('type', 'drawing');

    if (error) {
        console.error('Error fetching annotations:', error);
        throw ApiError.internal('Failed to fetch annotations');
    }

    // Group by page number
    const annotationsMap: Record<number, Annotation> = {};
    for (const row of data || []) {
        annotationsMap[row.page_number] = toAnnotation(row);
    }

    return annotationsMap;
};

/**
 * Get annotations for a specific page
 */
export const getPageAnnotations = async (
    documentId: string,
    userId: string,
    pageNumber: number
): Promise<Annotation | null> => {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
        .from('annotations')
        .select('*')
        .eq('document_id', documentId)
        .eq('user_id', userId)
        .eq('page_number', pageNumber)
        .eq('type', 'drawing')
        .maybeSingle();

    if (error) {
        console.error('Error fetching page annotations:', error);
        throw ApiError.internal('Failed to fetch annotations');
    }

    return data ? toAnnotation(data) : null;
};

/**
 * Save annotations for a page (create or update)
 */
export const saveAnnotations = async (
    documentId: string,
    userId: string,
    pageNumber: number,
    type: AnnotationType,
    content: AnnotationContent
): Promise<Annotation> => {
    const supabase = getSupabaseAdmin();

    // Check if annotation exists for this page
    const { data: existing } = await supabase
        .from('annotations')
        .select('id')
        .eq('document_id', documentId)
        .eq('user_id', userId)
        .eq('page_number', pageNumber)
        .eq('type', type)
        .maybeSingle();

    if (existing?.id) {
        // Update existing
        const { data, error } = await supabase
            .from('annotations')
            .update({
                content,
                updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
            .select()
            .single();

        if (error || !data) {
            console.error('Error updating annotation:', error);
            throw ApiError.internal('Failed to update annotation');
        }

        return toAnnotation(data);
    } else {
        // Create new
        const { data, error } = await supabase
            .from('annotations')
            .insert({
                document_id: documentId,
                user_id: userId,
                page_number: pageNumber,
                type,
                content,
            })
            .select()
            .single();

        if (error || !data) {
            console.error('Error creating annotation:', error);
            throw ApiError.internal('Failed to create annotation');
        }

        return toAnnotation(data);
    }
};

/**
 * Delete annotations for a specific page
 */
export const deletePageAnnotations = async (
    documentId: string,
    userId: string,
    pageNumber: number
): Promise<number> => {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
        .from('annotations')
        .delete()
        .eq('document_id', documentId)
        .eq('user_id', userId)
        .eq('page_number', pageNumber)
        .eq('type', 'drawing')
        .select();

    if (error) {
        console.error('Error deleting annotations:', error);
        throw ApiError.internal('Failed to delete annotations');
    }

    return data?.length || 0;
};

/**
 * Delete all annotations for a document
 */
export const deleteDocumentAnnotations = async (
    documentId: string,
    userId: string
): Promise<number> => {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
        .from('annotations')
        .delete()
        .eq('document_id', documentId)
        .eq('user_id', userId)
        .select();

    if (error) {
        console.error('Error deleting document annotations:', error);
        throw ApiError.internal('Failed to delete annotations');
    }

    return data?.length || 0;
};
