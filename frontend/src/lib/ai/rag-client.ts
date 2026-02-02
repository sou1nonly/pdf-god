/**
 * RAG Client Service
 * Frontend service to interact with RAG API endpoints
 */

// ============================================
// Types
// ============================================

export interface RAGSource {
    id: string;
    content: string;
    pageNumber: number | null;
    similarity: number;
    chunkIndex: number;
}

export interface RAGResponse {
    answer: string;
    sources: RAGSource[];
    tokensUsed: number;
    ragUsed: boolean;
}

export interface IndexingStatus {
    isIndexed: boolean;
    indexedAt: string | null;
    chunksCount: number;
}

export interface IndexingResult {
    success: boolean;
    chunksCreated?: number;
    error?: string;
}

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

// ============================================
// API Base
// ============================================

const API_BASE = '/api/rag';

async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        credentials: 'include', // Include cookies for Supabase auth
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error?.message || 'API request failed');
    }

    return data.data || data;
}

// ============================================
// Public API
// ============================================

/**
 * Get the indexing status of a document
 */
export async function getIndexingStatus(documentId: string): Promise<IndexingStatus> {
    return apiRequest<IndexingStatus>(`/status?documentId=${documentId}`, {
        method: 'GET'
    });
}

/**
 * Index a document for RAG
 * @param documentId - The document ID
 * @param documentText - Full text content of the document
 * @param pageCount - Total number of pages
 * @param onProgress - Optional progress callback
 */
export async function indexDocument(
    documentId: string,
    documentText: string,
    pageCount: number = 1,
    onProgress?: (status: string) => void
): Promise<IndexingResult> {
    onProgress?.('Preparing document...');

    try {
        onProgress?.('Generating embeddings...');

        const result = await apiRequest<{ message: string; chunksCreated: number }>('/index', {
            method: 'POST',
            body: JSON.stringify({
                documentId,
                documentText,
                pageCount
            })
        });

        onProgress?.('Indexing complete!');

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
 * @param documentId - The document ID
 * @param query - The user's question
 * @param history - Conversation history
 */
export async function queryDocument(
    documentId: string,
    query: string,
    history: ChatMessage[] = []
): Promise<RAGResponse> {
    return apiRequest<RAGResponse>('/query', {
        method: 'POST',
        body: JSON.stringify({
            documentId,
            query,
            history: history.map(m => ({
                role: m.role,
                content: m.content
            }))
        })
    });
}

/**
 * Clear the index for a document
 */
export async function clearIndex(documentId: string): Promise<void> {
    await apiRequest('/clear', {
        method: 'POST',
        body: JSON.stringify({ documentId })
    });
}

/**
 * Check if a document is ready for RAG queries
 */
export async function isDocumentIndexed(documentId: string): Promise<boolean> {
    try {
        const status = await getIndexingStatus(documentId);
        return status.isIndexed && status.chunksCount > 0;
    } catch {
        return false;
    }
}
