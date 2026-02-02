-- RAG Embeddings Schema for AI-powered document search
-- This migration adds vector storage for semantic search capabilities

-- Enable the pgvector extension for vector operations
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- Document Chunks Table
-- Stores text chunks with their embeddings for RAG
-- ============================================
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(768), -- Gemini embedding dimension
    page_number INTEGER,
    start_char INTEGER,
    end_char INTEGER,
    token_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Add indexing columns to documents table
-- ============================================
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS is_indexed BOOLEAN DEFAULT false;

ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS indexed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS content_version INTEGER DEFAULT 0;

-- ============================================
-- Indexes for performance
-- ============================================

-- HNSW index for fast similarity search (cosine distance)
CREATE INDEX IF NOT EXISTS idx_chunks_embedding 
ON public.document_chunks 
USING hnsw (embedding vector_cosine_ops);

-- Index for quick document lookup
CREATE INDEX IF NOT EXISTS idx_chunks_document_id 
ON public.document_chunks(document_id);

-- Index for chunk ordering
CREATE INDEX IF NOT EXISTS idx_chunks_order 
ON public.document_chunks(document_id, chunk_index);

-- ============================================
-- Row Level Security (RLS)
-- ============================================
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- Users can only view chunks of their own documents
CREATE POLICY "Users can view chunks of their documents"
    ON public.document_chunks FOR SELECT
    USING (
        document_id IN (
            SELECT id FROM public.documents 
            WHERE user_id = auth.uid()
        )
    );

-- Users can insert chunks for their own documents
CREATE POLICY "Users can insert chunks for their documents"
    ON public.document_chunks FOR INSERT
    WITH CHECK (
        document_id IN (
            SELECT id FROM public.documents 
            WHERE user_id = auth.uid()
        )
    );

-- Users can update chunks of their own documents
CREATE POLICY "Users can update chunks of their documents"
    ON public.document_chunks FOR UPDATE
    USING (
        document_id IN (
            SELECT id FROM public.documents 
            WHERE user_id = auth.uid()
        )
    );

-- Users can delete chunks of their own documents
CREATE POLICY "Users can delete chunks of their documents"
    ON public.document_chunks FOR DELETE
    USING (
        document_id IN (
            SELECT id FROM public.documents 
            WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- Semantic Search Function
-- ============================================

-- Function to find similar chunks using vector similarity
-- Note: Accepts text input for Supabase JS compatibility, casts to vector internally
CREATE OR REPLACE FUNCTION match_document_chunks(
    query_embedding TEXT,
    match_document_id UUID,
    match_count INT DEFAULT 5,
    match_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
    id UUID,
    chunk_index INTEGER,
    content TEXT,
    page_number INTEGER,
    similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    query_vector vector(768);
BEGIN
    -- Cast text input to vector
    query_vector := query_embedding::vector(768);
    
    RETURN QUERY
    SELECT
        dc.id,
        dc.chunk_index,
        dc.content,
        dc.page_number,
        (1 - (dc.embedding <=> query_vector))::FLOAT AS similarity
    FROM public.document_chunks dc
    WHERE dc.document_id = match_document_id
        AND dc.embedding IS NOT NULL
        AND (1 - (dc.embedding <=> query_vector)) > match_threshold
    ORDER BY dc.embedding <=> query_vector
    LIMIT match_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION match_document_chunks TO authenticated;

