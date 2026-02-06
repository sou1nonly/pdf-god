/**
 * RAG Client - Simplified
 * 3 functions: indexDocument, queryDocument, getStatus
 */

import { supabase } from "@/integrations/supabase/client";

const API_BASE = '/api/rag';

// ============================================
// Types
// ============================================

export interface RAGStatus {
    isIndexed: boolean;
    chunksCount: number;
    indexedAt: string | null;
}

export interface RAGSource {
    id: Key;
    content: string;
    pageNumber: number | null;
    similarity?: number;
}

export interface RAGResponse {
    answer: string;
    sources: RAGSource[];
    ragUsed: boolean;
}

export interface IndexResult {
    success: boolean;
    chunksCreated?: number;
    error?: string;
}

// ============================================
// Helper
// ============================================

async function apiRequest<T>(action: string, options: RequestInit = {}): Promise<T> {
    // Get auth token
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>)
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_BASE}?action=${action}`;

    const response = await fetch(url, {
        headers,
        ...options
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error?.message || `API error: ${response.status}`);
    }

    return data.data || data;
}

// ============================================
// Public API
// ============================================

/**
 * Check if a document is indexed
 */
export async function getIndexingStatus(documentId: string): Promise<RAGStatus> {
    return apiRequest<RAGStatus>(`status&documentId=${documentId}`, {
        method: 'GET'
    });
}

/**
 * Index a document for RAG
 */
export async function indexDocument(
    documentId: string,
    documentText: string,
    pageCount: number = 1
): Promise<IndexResult> {
    try {
        const result = await apiRequest<{ message: string; chunksCreated: number }>('index', {
            method: 'POST',
            body: JSON.stringify({
                documentId,
                documentText,
                pageCount
            })
        });

        return {
            success: true,
            chunksCreated: result.chunksCreated
        };
    } catch (error: any) {
        return {
            success: false,
            error: error.message || 'Indexing failed'
        };
    }
}

/**
 * Query a document using RAG
 */
export async function queryDocument(
    documentId: string,
    query: string
): Promise<RAGResponse> {
    return apiRequest<RAGResponse>('query', {
        method: 'POST',
        body: JSON.stringify({
            documentId,
            query
        })
    });
}

/**
 * Check if document is ready for RAG queries
 */
export async function isDocumentIndexed(documentId: string): Promise<boolean> {
    try {
        const status = await getIndexingStatus(documentId);
        return status.isIndexed && status.chunksCount > 0;
    } catch {
        return false;
    }
}
