/**
 * RAG API - Single Endpoint
 * /api/rag.ts
 * 
 * Uses query param ?action= for routing:
 * - POST /api/rag?action=index   - Index document
 * - GET  /api/rag?action=status  - Get indexing status
 * - POST /api/rag?action=query   - Query with RAG
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from './lib/auth';
import { sendSuccess, sendError, handleError } from './lib/response';
import { getSupabaseAdmin } from './lib/supabase';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const EMBEDDING_MODEL = 'gemini-embedding-001';
const CHAT_MODEL = 'gemini-2.5-flash';

// ============================================
// Chunking
// ============================================

interface Chunk {
    content: string;
    index: number;
    pageNumber: number | null;
}

function chunkText(text: string, pageCount: number = 1): Chunk[] {
    const chunks: Chunk[] = [];
    const CHUNK_SIZE = 800;  // ~200 tokens
    const OVERLAP = 100;

    // Split by paragraphs first
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);

    let currentChunk = '';
    let chunkIndex = 0;

    for (const para of paragraphs) {
        if (currentChunk.length + para.length > CHUNK_SIZE && currentChunk.length > 0) {
            // Save current chunk
            chunks.push({
                content: currentChunk.trim(),
                index: chunkIndex++,
                pageNumber: Math.min(Math.floor(chunkIndex / 3) + 1, pageCount)
            });
            // Keep overlap
            currentChunk = currentChunk.slice(-OVERLAP) + ' ' + para;
        } else {
            currentChunk += (currentChunk ? '\n\n' : '') + para;
        }
    }

    // Don't forget the last chunk
    if (currentChunk.trim()) {
        chunks.push({
            content: currentChunk.trim(),
            index: chunkIndex,
            pageNumber: pageCount
        });
    }

    return chunks;
}

// ============================================
// Embedding
// ============================================

async function generateEmbedding(text: string): Promise<number[]> {
    if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY not configured');
    }

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${GEMINI_API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: `models/${EMBEDDING_MODEL}`,
                content: { parts: [{ text }] },
                outputDimensionality: 768
            })
        }
    );

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Embedding failed: ${err}`);
    }

    const data = await response.json();
    return data.embedding?.values || [];
}

async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    // Process in batches of 10 to avoid rate limits
    const results: number[][] = [];
    const batchSize = 10;

    for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const embeddings = await Promise.all(batch.map(t => generateEmbedding(t)));
        results.push(...embeddings);
    }

    return results;
}

// ============================================
// AI Response Generation
// ============================================

async function generateAnswer(query: string, context: string): Promise<string> {
    if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY not configured');
    }

    const prompt = `Based on the following context from a document, answer the question.
If the answer cannot be found in the context, say so.

Context:
${context}

Question: ${query}

Answer:`;

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${CHAT_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.3, maxOutputTokens: 1024 }
            })
        }
    );

    if (!response.ok) {
        const errText = await response.text();
        console.error('Gemini API error:', errText);
        throw new Error(`AI generation failed: ${errText.substring(0, 200)}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate response.';
}

// ============================================
// Main Handler
// ============================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const action = req.query.action as string;

    try {
        const user = await requireAuth(req);
        const supabase = getSupabaseAdmin();

        // ============================================
        // GET ?action=status - Check indexing status
        // ============================================
        if (action === 'status' && req.method === 'GET') {
            const documentId = req.query.documentId as string;

            if (!documentId) {
                return sendError(res, 'MISSING_PARAM', 'documentId required', 400);
            }

            const { count } = await supabase
                .from('document_chunks')
                .select('*', { count: 'exact', head: true })
                .eq('document_id', documentId);

            return sendSuccess(res, {
                isIndexed: (count || 0) > 0,
                chunksCount: count || 0,
                indexedAt: count ? new Date().toISOString() : null
            });
        }

        // ============================================
        // POST ?action=index - Index a document
        // ============================================
        if (action === 'index' && req.method === 'POST') {
            const { documentId, documentText, pageCount = 1 } = req.body || {};

            if (!documentId) {
                return sendError(res, 'MISSING_PARAM', 'documentId required', 400);
            }
            if (!documentText || documentText.trim().length < 10) {
                return sendError(res, 'MISSING_PARAM', 'documentText required (min 10 chars)', 400);
            }

            // Check if already indexed
            const { count: existing } = await supabase
                .from('document_chunks')
                .select('*', { count: 'exact', head: true })
                .eq('document_id', documentId);

            if (existing && existing > 0) {
                return sendSuccess(res, {
                    message: 'Already indexed',
                    chunksCreated: existing
                });
            }

            // Chunk the text
            const chunks = chunkText(documentText, pageCount);

            if (chunks.length === 0) {
                return sendError(res, 'NO_CONTENT', 'No content to index', 400);
            }

            // Generate embeddings
            const embeddings = await generateEmbeddingsBatch(chunks.map(c => c.content));

            // Store chunks with embeddings
            const rows = chunks.map((chunk, i) => ({
                document_id: documentId,
                chunk_index: chunk.index,
                content: chunk.content,
                embedding: `[${embeddings[i].join(',')}]`,  // pgvector format
                page_number: chunk.pageNumber,
                created_at: new Date().toISOString()
            }));

            const { error: insertError } = await supabase
                .from('document_chunks')
                .insert(rows);

            if (insertError) {
                console.error('Insert error:', insertError);
                return sendError(res, 'DB_ERROR', insertError.message, 500);
            }

            return sendSuccess(res, {
                message: 'Document indexed successfully',
                chunksCreated: chunks.length
            });
        }

        // ============================================
        // POST ?action=query - Query with RAG
        // ============================================
        if (action === 'query' && req.method === 'POST') {
            const { documentId, query } = req.body || {};

            if (!documentId) {
                return sendError(res, 'MISSING_PARAM', 'documentId required', 400);
            }
            if (!query || query.trim().length < 2) {
                return sendError(res, 'MISSING_PARAM', 'query required', 400);
            }

            // Simple greeting detection
            const lower = query.toLowerCase().trim();
            if (['hi', 'hello', 'hey', 'thanks', 'ok', 'bye'].some(g => lower.startsWith(g))) {
                return sendSuccess(res, {
                    answer: 'Hello! How can I help you with this document?',
                    sources: [],
                    ragUsed: false
                });
            }

            // Generate query embedding
            const queryEmbedding = await generateEmbedding(query);
            const embeddingStr = `[${queryEmbedding.join(',')}]`;

            // Search for similar chunks using RPC
            const { data: chunks, error: searchError } = await supabase.rpc(
                'match_document_chunks',
                {
                    query_embedding: embeddingStr,
                    match_count: 5,
                    filter_document_id: documentId
                }
            );

            if (searchError) {
                console.error('Search error:', searchError);
                // Fallback: direct query without vector search
                const { data: fallbackChunks } = await supabase
                    .from('document_chunks')
                    .select('content, page_number')
                    .eq('document_id', documentId)
                    .limit(5);

                if (fallbackChunks && fallbackChunks.length > 0) {
                    const context = fallbackChunks.map(c => c.content).join('\n\n');
                    const answer = await generateAnswer(query, context);
                    return sendSuccess(res, {
                        answer,
                        sources: fallbackChunks.map((c, i) => ({
                            content: c.content.substring(0, 100) + '...',
                            pageNumber: c.page_number
                        })),
                        ragUsed: true
                    });
                }

                return sendSuccess(res, {
                    answer: "I don't have enough context to answer that question.",
                    sources: [],
                    ragUsed: false
                });
            }

            if (!chunks || chunks.length === 0) {
                return sendSuccess(res, {
                    answer: "I couldn't find relevant information to answer your question.",
                    sources: [],
                    ragUsed: false
                });
            }

            // Build context and generate answer
            const context = chunks.map((c: any) => c.content).join('\n\n');
            const answer = await generateAnswer(query, context);

            return sendSuccess(res, {
                answer,
                sources: chunks.map((c: any) => ({
                    content: c.content.substring(0, 100) + '...',
                    pageNumber: c.page_number,
                    similarity: c.similarity
                })),
                ragUsed: true
            });
        }

        // Unknown action
        return sendError(res, 'NOT_FOUND', `Unknown action: ${action}`, 404);

    } catch (error) {
        return handleError(res, error);
    }
}
