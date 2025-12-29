/**
 * Documents API Service
 * Frontend API calls for document management
 */

import { api } from '../client';
import type { Document, PaginatedResponse } from '@/types';

export interface ListDocumentsParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
}

export interface DocumentResponse {
    document: Document;
}

/**
 * List documents with pagination
 */
export const listDocuments = async (params: ListDocumentsParams = {}): Promise<PaginatedResponse<Document>> => {
    return api.get<PaginatedResponse<Document>>('/documents', { params });
};

/**
 * Get a single document by ID
 */
export const getDocument = async (id: string): Promise<Document> => {
    const { document } = await api.get<DocumentResponse>(`/documents/${id}`);
    return document;
};

/**
 * Create a new document record
 */
export const createDocument = async (data: {
    fileName: string;
    fileSize: number;
    fileType: string;
    storagePath: string;
}): Promise<Document> => {
    const { document } = await api.post<DocumentResponse>('/documents', data);
    return document;
};

/**
 * Update a document
 */
export const updateDocument = async (
    id: string,
    data: {
        fileName?: string;
        status?: string;
        isPublic?: boolean;
    }
): Promise<Document> => {
    const { document } = await api.patch<DocumentResponse>(`/documents/${id}`, data);
    return document;
};

/**
 * Delete a document
 */
export const deleteDocument = async (id: string): Promise<void> => {
    await api.delete(`/documents/${id}`);
};

export const documentsApi = {
    list: listDocuments,
    get: getDocument,
    create: createDocument,
    update: updateDocument,
    delete: deleteDocument,
};

export default documentsApi;
