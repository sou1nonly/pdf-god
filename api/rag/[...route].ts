/**
 * RAG API Endpoints
 * /api/rag/[...route].ts
 * 
 * Endpoints:
 * - POST /api/rag/index     - Index a document for RAG
 * - GET  /api/rag/status    - Get indexing status
 * - POST /api/rag/query     - Query with RAG
 * - POST /api/rag/clear     - Clear document index
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../lib/auth';
import { sendSuccess, sendError, handleError } from '../lib/response';
import {
    indexDocument,
    getIndexingStatus,
    clearIndexing,
    queryWithRAG,
    needsRAG
} from '../lib/rag-service';

// Simple direct response for non-RAG queries
async function directResponse(query: string): Promise<string> {
    const greetings: Record<string, string> = {
        'hi': 'Hello! How can I help you with this document?',
        'hello': 'Hi there! Feel free to ask me anything about this document.',
        'hey': 'Hey! What would you like to know about the document?',
        'thanks': "You're welcome! Let me know if you have more questions.",
        'thank you': "You're welcome! Happy to help.",
        'bye': 'Goodbye! Feel free to come back anytime.',
        'ok': 'Great! What else would you like to know?',
        'okay': 'Sounds good! Any other questions?'
    };

    const lower = query.toLowerCase().trim();

    for (const [key, response] of Object.entries(greetings)) {
        if (lower.startsWith(key)) {
            return response;
        }
    }

    return "I'm here to help you understand this document. What would you like to know?";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const route = req.query.route as string[] | undefined;
    const action = route?.[0] || '';

    try {
        await requireAuth(req);

        // ============================================
        // POST /api/rag/index - Index a document
        // ============================================
        if (action === 'index' && req.method === 'POST') {
            const { documentId, documentText, pageCount = 1 } = req.body || {};

            if (!documentId) {
                return sendError(res, 'MISSING_PARAM', 'documentId is required', 400);
            }

            if (!documentText || documentText.trim().length === 0) {
                return sendError(res, 'MISSING_PARAM', 'documentText is required', 400);
            }

            const result = await indexDocument(documentId, documentText, pageCount);

            if (result.success) {
                return sendSuccess(res, {
                    message: 'Document indexed successfully',
                    chunksCreated: result.chunksCreated
                });
            } else {
                return sendError(res, 'INDEXING_FAILED', result.error || 'Indexing failed', 500);
            }
        }

        // ============================================
        // GET /api/rag/status - Get indexing status
        // ============================================
        if (action === 'status' && req.method === 'GET') {
            const documentId = req.query.documentId as string;

            if (!documentId) {
                return sendError(res, 'MISSING_PARAM', 'documentId query param is required', 400);
            }

            const status = await getIndexingStatus(documentId);
            return sendSuccess(res, status);
        }

        // ============================================
        // POST /api/rag/query - Query with RAG
        // ============================================
        if (action === 'query' && req.method === 'POST') {
            const { documentId, query, history = [] } = req.body || {};

            if (!documentId) {
                return sendError(res, 'MISSING_PARAM', 'documentId is required', 400);
            }

            if (!query || query.trim().length === 0) {
                return sendError(res, 'MISSING_PARAM', 'query is required', 400);
            }

            // Check if query needs RAG
            if (!needsRAG(query)) {
                const directAnswer = await directResponse(query);
                return sendSuccess(res, {
                    answer: directAnswer,
                    sources: [],
                    tokensUsed: 0,
                    ragUsed: false
                });
            }

            // Full RAG query
            const result = await queryWithRAG(documentId, query, history);
            return sendSuccess(res, result);
        }

        // ============================================
        // POST /api/rag/clear - Clear document index
        // ============================================
        if (action === 'clear' && req.method === 'POST') {
            const { documentId } = req.body || {};

            if (!documentId) {
                return sendError(res, 'MISSING_PARAM', 'documentId is required', 400);
            }

            await clearIndexing(documentId);
            return sendSuccess(res, { message: 'Index cleared successfully' });
        }

        // Unknown route
        return sendError(res, 'NOT_FOUND', `Route not found: ${action}`, 404);

    } catch (error) {
        return handleError(res, error);
    }
}
