/**
 * Convert API Service
 * Frontend API calls for file conversion
 * Note: Most conversions still happening client-side for now
 */

import { api, getAccessToken } from '../client';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface ConvertOptions {
    quality?: 'low' | 'medium' | 'high';
}

/**
 * Convert image to PDF (server-side)
 * Note: Currently falls back to client-side conversion
 */
export const convertImageToPdf = async (
    file: File,
    options: ConvertOptions = {}
): Promise<Blob> => {
    const formData = new FormData();
    formData.append('file', file);
    if (options.quality) {
        formData.append('quality', options.quality);
    }

    const response = await fetch(`${API_BASE_URL}/convert/image`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${getAccessToken()}`,
        },
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Conversion failed' } }));
        throw new Error(error.error?.message || 'Image conversion failed');
    }

    return response.blob();
};

/**
 * Convert text file to PDF (server-side)
 */
export const convertTextToPdf = async (
    file: File,
    options: ConvertOptions = {}
): Promise<Blob> => {
    const formData = new FormData();
    formData.append('file', file);
    if (options.quality) {
        formData.append('quality', options.quality);
    }

    const response = await fetch(`${API_BASE_URL}/convert/text`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${getAccessToken()}`,
        },
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Conversion failed' } }));
        throw new Error(error.error?.message || 'Text conversion failed');
    }

    return response.blob();
};

/**
 * Convert document (DOC/DOCX) to PDF (server-side)
 */
export const convertDocumentToPdf = async (
    file: File,
    options: ConvertOptions = {}
): Promise<Blob> => {
    const formData = new FormData();
    formData.append('file', file);
    if (options.quality) {
        formData.append('quality', options.quality);
    }

    const response = await fetch(`${API_BASE_URL}/convert/document`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${getAccessToken()}`,
        },
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Conversion failed' } }));
        throw new Error(error.error?.message || 'Document conversion failed');
    }

    return response.blob();
};

export const convertApi = {
    imageToPdf: convertImageToPdf,
    textToPdf: convertTextToPdf,
    documentToPdf: convertDocumentToPdf,
};

export default convertApi;
