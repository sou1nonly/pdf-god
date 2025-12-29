/**
 * Storage API Service
 * Frontend API calls for file storage
 */

import { api, getAccessToken } from '../client';
import type { Document } from '@/types';

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface UploadResponse {
    document: Document;
    storage: {
        path: string;
        url: string;
        size: number;
    };
}

export interface SignedUrlResponse {
    signedUrl: string;
    expiresAt: number;
}

/**
 * Upload a file and create document record
 * Returns the document and storage info
 */
export const uploadFile = async (
    file: File,
    folder: string = 'documents',
    onProgress?: (progress: number) => void
): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    // Use XMLHttpRequest for progress tracking
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable && onProgress) {
                const progress = Math.round((event.loaded / event.total) * 100);
                onProgress(progress);
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success) {
                        resolve(response.data);
                    } else {
                        reject(new Error(response.error?.message || 'Upload failed'));
                    }
                } catch (e) {
                    reject(new Error('Invalid response from server'));
                }
            } else {
                try {
                    const error = JSON.parse(xhr.responseText);
                    reject(new Error(error.error?.message || `Upload failed with status ${xhr.status}`));
                } catch {
                    reject(new Error(`Upload failed with status ${xhr.status}`));
                }
            }
        });

        xhr.addEventListener('error', () => {
            reject(new Error('Network error during upload'));
        });

        xhr.open('POST', `${API_BASE_URL}/storage/upload`);

        const token = getAccessToken();
        if (token) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        xhr.send(formData);
    });
};

/**
 * Download a file as Blob
 */
export const downloadFile = async (storagePath: string): Promise<Blob> => {
    const response = await fetch(`${API_BASE_URL}/storage/download/${encodeURIComponent(storagePath)}`, {
        headers: {
            Authorization: `Bearer ${getAccessToken()}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`);
    }

    return response.blob();
};

/**
 * Delete a file from storage
 */
export const deleteFile = async (storagePath: string): Promise<void> => {
    await api.delete(`/storage/${encodeURIComponent(storagePath)}`);
};

/**
 * Get a signed URL for private file access
 */
export const getSignedUrl = async (storagePath: string, expiresIn: number = 3600): Promise<SignedUrlResponse> => {
    return api.get<SignedUrlResponse>(`/storage/signed-url/${encodeURIComponent(storagePath)}`, {
        params: { expiresIn },
    });
};

export const storageApi = {
    upload: uploadFile,
    download: downloadFile,
    delete: deleteFile,
    getSignedUrl,
};

export default storageApi;
