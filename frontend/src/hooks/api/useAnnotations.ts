/**
 * Annotations Query Hooks
 * React Query hooks for annotations API
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { annotationsApi, type SaveAnnotationData } from '@/api/services/annotations.api';
import { toast } from 'sonner';

// Query keys
export const annotationKeys = {
    all: ['annotations'] as const,
    document: (documentId: string) => [...annotationKeys.all, documentId] as const,
    page: (documentId: string, pageNumber: number) => [...annotationKeys.document(documentId), pageNumber] as const,
};

/**
 * Hook to fetch all annotations for a document
 */
export const useAnnotations = (documentId: string | undefined) => {
    return useQuery({
        queryKey: annotationKeys.document(documentId || ''),
        queryFn: () => annotationsApi.getAll(documentId!),
        enabled: !!documentId,
        staleTime: 60000, // 1 minute
    });
};

/**
 * Hook to fetch annotations for a specific page
 */
export const usePageAnnotations = (documentId: string | undefined, pageNumber: number) => {
    return useQuery({
        queryKey: annotationKeys.page(documentId || '', pageNumber),
        queryFn: () => annotationsApi.getPage(documentId!, pageNumber),
        enabled: !!documentId,
        staleTime: 60000,
    });
};

/**
 * Hook to save annotations
 */
export const useSaveAnnotations = (documentId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: SaveAnnotationData) => annotationsApi.save(documentId, data),
        onSuccess: (annotation) => {
            // Update the document annotations cache
            queryClient.invalidateQueries({ queryKey: annotationKeys.document(documentId) });
            queryClient.setQueryData(annotationKeys.page(documentId, annotation.pageNumber), annotation);
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to save annotations');
        },
    });
};

/**
 * Hook to delete page annotations
 */
export const useDeletePageAnnotations = (documentId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (pageNumber: number) => annotationsApi.deletePage(documentId, pageNumber),
        onSuccess: (_, pageNumber) => {
            queryClient.invalidateQueries({ queryKey: annotationKeys.document(documentId) });
            queryClient.removeQueries({ queryKey: annotationKeys.page(documentId, pageNumber) });
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete annotations');
        },
    });
};
