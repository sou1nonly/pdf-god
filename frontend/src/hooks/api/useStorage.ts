/**
 * Storage Hooks
 * React Query hooks and utilities for storage API
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { storageApi } from '@/api/services/storage.api';
import { documentKeys } from './useDocuments';
import { toast } from 'sonner';
import { useState, useCallback } from 'react';

/**
 * Hook for file upload with progress tracking
 */
export const useUploadFile = () => {
    const queryClient = useQueryClient();
    const [progress, setProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);

    const upload = useCallback(async (file: File, folder: string = 'documents') => {
        setIsUploading(true);
        setProgress(0);

        try {
            const result = await storageApi.upload(file, folder, (p) => setProgress(p));

            // Invalidate documents list to show new document
            queryClient.invalidateQueries({ queryKey: documentKeys.lists() });

            toast.success('File uploaded successfully');
            return result;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Upload failed';
            toast.error(message);
            throw error;
        } finally {
            setIsUploading(false);
        }
    }, [queryClient]);

    const reset = useCallback(() => {
        setProgress(0);
        setIsUploading(false);
    }, []);

    return {
        upload,
        progress,
        isUploading,
        reset,
    };
};

/**
 * Hook for file download
 */
export const useDownloadFile = () => {
    return useMutation({
        mutationFn: async ({ storagePath, fileName }: { storagePath: string; fileName?: string }) => {
            const blob = await storageApi.download(storagePath);

            // Create download link
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName || storagePath.split('/').pop() || 'download';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            return blob;
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Download failed');
        },
    });
};

/**
 * Hook for getting signed URLs
 */
export const useSignedUrl = () => {
    return useMutation({
        mutationFn: ({ storagePath, expiresIn }: { storagePath: string; expiresIn?: number }) =>
            storageApi.getSignedUrl(storagePath, expiresIn),
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to get signed URL');
        },
    });
};
