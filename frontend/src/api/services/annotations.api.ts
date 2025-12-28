/**
 * Annotations API Service
 * Frontend API calls for annotations management
 */

import { api } from '../client';
import type { Annotation } from '@lamina/shared';

export interface AnnotationsResponse {
    annotations: Record<number, Annotation>;
}

export interface AnnotationResponse {
    annotation: Annotation | null;
}

export interface SaveAnnotationData {
    pageNumber: number;
    type?: 'drawing' | 'comment' | 'highlight' | 'text' | 'shape';
    content: {
        objects: unknown[];
        version?: string;
    };
}

/**
 * Get all annotations for a document
 */
export const getAnnotations = async (documentId: string): Promise<Record<number, Annotation>> => {
    const { annotations } = await api.get<AnnotationsResponse>(`/documents/${documentId}/annotations`);
    return annotations;
};

/**
 * Get annotations for a specific page
 */
export const getPageAnnotations = async (documentId: string, pageNumber: number): Promise<Annotation | null> => {
    const { annotation } = await api.get<AnnotationResponse>(`/documents/${documentId}/annotations/${pageNumber}`);
    return annotation;
};

/**
 * Save annotations for a page
 */
export const saveAnnotations = async (documentId: string, data: SaveAnnotationData): Promise<Annotation> => {
    const { annotation } = await api.post<{ annotation: Annotation }>(`/documents/${documentId}/annotations`, {
        ...data,
        type: data.type || 'drawing',
        content: {
            ...data.content,
            version: data.content.version || '5.3.0',
        },
    });
    return annotation;
};

/**
 * Delete annotations for a specific page
 */
export const deletePageAnnotations = async (documentId: string, pageNumber: number): Promise<void> => {
    await api.delete(`/documents/${documentId}/annotations/${pageNumber}`);
};

/**
 * Delete all annotations for a document
 */
export const deleteDocumentAnnotations = async (documentId: string): Promise<void> => {
    await api.delete(`/documents/${documentId}/annotations`);
};

export const annotationsApi = {
    getAll: getAnnotations,
    getPage: getPageAnnotations,
    save: saveAnnotations,
    deletePage: deletePageAnnotations,
    deleteAll: deleteDocumentAnnotations,
};

export default annotationsApi;
