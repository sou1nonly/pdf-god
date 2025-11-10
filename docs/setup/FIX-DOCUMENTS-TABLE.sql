-- Complete Fix for Documents Table
-- Run this ENTIRE script in Supabase SQL Editor

-- Step 1: Drop the table if it exists (to start fresh)
DROP TABLE IF EXISTS public.documents CASCADE;

-- Step 2: Create the table with ALL required columns
CREATE TABLE public.documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Step 3: Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS Policies
CREATE POLICY "Users can view their own documents"
    ON public.documents
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents"
    ON public.documents
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
    ON public.documents
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
    ON public.documents
    FOR DELETE
    USING (auth.uid() = user_id);

-- Step 5: Create indexes for performance
CREATE INDEX idx_documents_user_id ON public.documents(user_id);
CREATE INDEX idx_documents_created_at ON public.documents(created_at DESC);

-- Step 6: Verify the table was created correctly
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'documents'
ORDER BY ordinal_position;

