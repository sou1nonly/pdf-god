/**
 * Documents Query Hooks
 * React Query hooks for documents API
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi, type ListDocumentsParams } from '@/api/services/documents.api';
import { toast } from 'sonner';

// Query keys
export const documentKeys = {
    all: ['documents'] as const,
    lists: () => [...documentKeys.all, 'list'] as const,
    list: (params: ListDocumentsParams) => [...documentKeys.lists(), params] as const,
    details: () => [...documentKeys.all, 'detail'] as const,
    detail: (id: string) => [...documentKeys.details(), id] as const,
};

/**
 * Hook to fetch documents list
 */
export const useDocuments = (params: ListDocumentsParams = {}) => {
    return useQuery({
        queryKey: documentKeys.list(params),
        queryFn: () => documentsApi.list(params),
        staleTime: 30000, // 30 seconds
    });
};

/**
 * Hook to fetch a single document
 */
export const useDocument = (id: string | undefined) => {
    return useQuery({
        queryKey: documentKeys.detail(id || ''),
        queryFn: () => documentsApi.get(id!),
        enabled: !!id,
    });
};

/**
 * Hook to update a document
 */
export const useUpdateDocument = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Parameters<typeof documentsApi.update>[1] }) =>
            documentsApi.update(id, data),
        onSuccess: (updatedDoc) => {
            // Invalidate and refetch documents list
            queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
            // Update the specific document in cache
            queryClient.setQueryData(documentKeys.detail(updatedDoc.id), updatedDoc);
            toast.success('Document updated successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update document');
        },
    });
};

/**
 * Hook to delete a document
 */
export const useDeleteDocument = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => documentsApi.delete(id),
        onSuccess: (_, id) => {
            // Invalidate documents list
            queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
            // Remove from detail cache
            queryClient.removeQueries({ queryKey: documentKeys.detail(id) });
            toast.success('Document deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete document');
        },
    });
};
