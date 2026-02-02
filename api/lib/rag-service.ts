/**
 * RAG Service
 * Orchestrates the full RAG pipeline:
 * 1. Document indexing (chunk → embed → store)
 * 2. Query processing (embed → search → rerank → context)
 * 3. Response generation with sources
 */

import { getSupabaseAdmin } from './supabase';
import { generateEmbedding, generateEmbeddings } from './embedding-service';
import { chunkDocument, Chunk } from './chunking-service';

// ============================================
// Types
// ============================================

export interface RetrievedChunk {
    id: string;
    content: string;
    pageNumber: number | null;
    similarity: number;
    chunkIndex: number;
}

export interface IndexingResult {
    success: boolean;
    chunksCreated: number;
    error?: string;
}

export interface RAGSearchResult {
    chunks: RetrievedChunk[];
    query: string;
}

export interface RAGResponse {
    answer: string;
    sources: RetrievedChunk[];
    tokensUsed: number;
    ragUsed: boolean;
}

// ============================================
// Configuration
// ============================================

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const TOP_K_RETRIEVE = 8;    // Initial retrieval count
const TOP_K_FINAL = 4;       // After reranking
const SIMILARITY_THRESHOLD = 0.5;

// ============================================
// Document Indexing
// ============================================

/**
 * Index a document: chunk → embed → store in Supabase
 */
export async function indexDocument(
    documentId: string,
    documentText: string,
    totalPages: number = 1
): Promise<IndexingResult> {
    const supabase = getSupabaseAdmin();

    try {
        // 1. Delete existing chunks for this document
        await supabase
            .from('document_chunks')
            .delete()
            .eq('document_id', documentId);

        // 2. Chunk the document
        const chunks = chunkDocument(documentText, totalPages);

        if (chunks.length === 0) {
            return { success: false, chunksCreated: 0, error: 'No content to index' };
        }

        // 3. Generate embeddings for all chunks
        const embeddings = await generateEmbeddings(
            chunks.map(c => c.content)
        );

        // 4. Prepare records for insertion
        // Format embedding as pgvector text: '[1,2,3,...]'
        const records = chunks.map((chunk, i) => ({
            document_id: documentId,
            chunk_index: chunk.index,
            content: chunk.content,
            embedding: `[${embeddings[i].join(',')}]`,
            page_number: chunk.pageNumber || null,
            start_char: chunk.startChar,
            end_char: chunk.endChar,
            token_count: chunk.tokenCount
        }));

        // 5. Insert chunks in batches
        const batchSize = 50;
        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            const { error } = await supabase
                .from('document_chunks')
                .insert(batch);

            if (error) {
                console.error('Insert error:', error);
                throw error;
            }
        }

        // 6. Mark document as indexed
        await supabase
            .from('documents')
            .update({
                is_indexed: true,
                indexed_at: new Date().toISOString(),
                content_version: 1
            })
            .eq('id', documentId);

        return { success: true, chunksCreated: chunks.length };

    } catch (error: any) {
        console.error('Indexing error:', error);
        return {
            success: false,
            chunksCreated: 0,
            error: error.message || 'Indexing failed'
        };
    }
}

/**
 * Check if a document is indexed
 */
export async function getIndexingStatus(documentId: string): Promise<{
    isIndexed: boolean;
    indexedAt: string | null;
    chunksCount: number;
}> {
    const supabase = getSupabaseAdmin();

    const { data: doc } = await supabase
        .from('documents')
        .select('is_indexed, indexed_at')
        .eq('id', documentId)
        .single();

    const { count } = await supabase
        .from('document_chunks')
        .select('*', { count: 'exact', head: true })
        .eq('document_id', documentId);

    return {
        isIndexed: doc?.is_indexed || false,
        indexedAt: doc?.indexed_at || null,
        chunksCount: count || 0
    };
}

/**
 * Clear indexing for a document (e.g., when content changes)
 */
export async function clearIndexing(documentId: string): Promise<void> {
    const supabase = getSupabaseAdmin();

    await supabase
        .from('document_chunks')
        .delete()
        .eq('document_id', documentId);

    await supabase
        .from('documents')
        .update({ is_indexed: false, indexed_at: null })
        .eq('id', documentId);
}

// ============================================
// Semantic Search
// ============================================

/**
 * Search for relevant chunks using vector similarity
 */
export async function searchChunks(
    documentId: string,
    query: string,
    topK: number = TOP_K_RETRIEVE
): Promise<RetrievedChunk[]> {
    const supabase = getSupabaseAdmin();

    // 1. Embed the query
    const queryEmbedding = await generateEmbedding(query);

    // 2. Call the similarity search function
    // Format as pgvector text: '[1,2,3,...]' for SQL casting
    const embeddingText = `[${queryEmbedding.join(',')}]`;

    const { data, error } = await supabase.rpc('match_document_chunks', {
        query_embedding: embeddingText,
        match_document_id: documentId,
        match_count: topK,
        match_threshold: SIMILARITY_THRESHOLD
    });

    if (error) {
        console.error('Search error:', error);
        return [];
    }

    return (data || []).map((row: any) => ({
        id: row.id,
        content: row.content,
        pageNumber: row.page_number,
        similarity: row.similarity,
        chunkIndex: row.chunk_index
    }));
}

// ============================================
// Reranking
// ============================================

/**
 * Rerank chunks using LLM scoring for better relevance
 */
export async function rerankChunks(
    query: string,
    chunks: RetrievedChunk[],
    topK: number = TOP_K_FINAL
): Promise<RetrievedChunk[]> {
    if (chunks.length <= topK) {
        return chunks;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        // Fallback to original order
        return chunks.slice(0, topK);
    }

    try {
        const prompt = `Score each text chunk's relevance to the query on a scale of 1-10.
Return ONLY a JSON array of integers, e.g., [8, 5, 9, 3, 7, 2, 6, 4]

Query: "${query}"

Chunks:
${chunks.map((c, i) => `[${i}] ${c.content.slice(0, 200)}...`).join('\n\n')}

Scores (JSON array only):`;

        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0, maxOutputTokens: 100 }
            })
        });

        if (!response.ok) {
            throw new Error('Rerank API failed');
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Extract JSON array from response
        const jsonMatch = text.match(/\[[\d,\s]+\]/);
        if (jsonMatch) {
            const scores: number[] = JSON.parse(jsonMatch[0]);

            // Sort by score and take top K
            return chunks
                .map((chunk, i) => ({ ...chunk, score: scores[i] || 0 }))
                .sort((a, b) => (b as any).score - (a as any).score)
                .slice(0, topK);
        }
    } catch (error) {
        console.error('Reranking error:', error);
    }

    // Fallback: return top K by original similarity
    return chunks.slice(0, topK);
}

/**
 * Reorder chunks to avoid "lost in the middle" problem
 * LLMs pay more attention to start and end of context
 */
function orderChunksForContext(chunks: RetrievedChunk[]): RetrievedChunk[] {
    if (chunks.length <= 2) return chunks;

    // Place most relevant at start, second most at end
    // Order: 1st, 3rd, 5th, ..., 4th, 2nd
    const ordered: RetrievedChunk[] = [];

    for (let i = 0; i < chunks.length; i++) {
        if (i % 2 === 0) {
            ordered.push(chunks[i]);
        }
    }

    for (let i = chunks.length - 1; i >= 0; i--) {
        if (i % 2 === 1) {
            ordered.push(chunks[i]);
        }
    }

    return ordered;
}

// ============================================
// Query Classification
// ============================================

/**
 * Check if query needs RAG or can be answered directly
 */
export function needsRAG(query: string): boolean {
    const noRAGPatterns = [
        /^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening))/i,
        /^(thanks|thank\s+you|ty|thx)/i,
        /^(bye|goodbye|see\s+you)/i,
        /^(yes|no|ok|okay|sure|got\s+it|understood)/i,
        /^(how\s+are\s+you|what\s+can\s+you\s+do)/i,
        /^(help|help\s+me)$/i
    ];

    const trimmed = query.trim();
    return !noRAGPatterns.some(pattern => pattern.test(trimmed));
}

// ============================================
// RAG Query (Main Function)
// ============================================

/**
 * Full RAG query: search → rerank → generate answer with sources
 */
export async function queryWithRAG(
    documentId: string,
    query: string,
    history: Array<{ role: string; content: string }> = []
): Promise<RAGResponse> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY not configured');
    }

    // 1. Retrieve relevant chunks
    const retrievedChunks = await searchChunks(documentId, query, TOP_K_RETRIEVE);

    if (retrievedChunks.length === 0) {
        return {
            answer: "I couldn't find relevant information in the document to answer your question. Please try rephrasing or ask about something covered in the document.",
            sources: [],
            tokensUsed: 0,
            ragUsed: true
        };
    }

    // 2. Rerank for better relevance
    const rerankedChunks = await rerankChunks(query, retrievedChunks, TOP_K_FINAL);

    // 3. Order to avoid lost-in-middle
    const orderedChunks = orderChunksForContext(rerankedChunks);

    // 4. Build context from chunks
    const context = orderedChunks
        .map((c, i) => {
            const pageInfo = c.pageNumber ? ` (Page ${c.pageNumber})` : '';
            return `[Source ${i + 1}${pageInfo}]\n${c.content}`;
        })
        .join('\n\n---\n\n');

    // 5. Build prompt
    const systemPrompt = `You are an AI assistant helping users understand a PDF document.

IMPORTANT INSTRUCTIONS:
- Answer questions based ONLY on the provided context below
- Always cite your sources using [Source N] notation
- If the context doesn't contain the answer, clearly say so
- Be concise but thorough
- Format your response with proper paragraphs

DOCUMENT CONTEXT:
${context}`;

    // 6. Build conversation
    const messages: any[] = [];

    // Add history (last 6 messages max)
    const recentHistory = history.slice(-6);
    for (const msg of recentHistory) {
        messages.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        });
    }

    // Add current query with system context
    messages.push({
        role: 'user',
        parts: [{ text: `${systemPrompt}\n\nUser Question: ${query}` }]
    });

    // 7. Generate response
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: messages,
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 1024
            }
        })
    });

    if (!response.ok) {
        throw new Error('Failed to generate response');
    }

    const data = await response.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text ||
        'Sorry, I could not generate a response.';

    // 8. Estimate tokens used
    const tokensUsed = Math.ceil(
        (context.length + query.length + answer.length) / 4
    );

    return {
        answer,
        sources: orderedChunks,
        tokensUsed,
        ragUsed: true
    };
}
