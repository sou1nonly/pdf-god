-- Fix Annotations Table RLS Policies
-- Run this in Supabase SQL Editor to fix 406 errors

-- First, check if annotations table exists, if not create it
CREATE TABLE IF NOT EXISTS public.annotations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    document_id UUID NOT NULL,
    user_id UUID NOT NULL,
    page_number INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('comment', 'highlight', 'text', 'drawing', 'shape')),
    content JSONB,
    position JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS if not already enabled
ALTER TABLE public.annotations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view annotations on their documents" ON public.annotations;
DROP POLICY IF EXISTS "Users can insert annotations on their documents" ON public.annotations;
DROP POLICY IF EXISTS "Users can update their own annotations" ON public.annotations;
DROP POLICY IF EXISTS "Users can delete their own annotations" ON public.annotations;
DROP POLICY IF EXISTS "Users can view their own annotations" ON public.annotations;
DROP POLICY IF EXISTS "Users can insert their own annotations" ON public.annotations;

-- Create simplified RLS policies (user can manage their own annotations)
CREATE POLICY "Users can view their own annotations"
    ON public.annotations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own annotations"
    ON public.annotations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own annotations"
    ON public.annotations FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own annotations"
    ON public.annotations FOR DELETE
    USING (auth.uid() = user_id);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_annotations_document_id ON public.annotations(document_id);
CREATE INDEX IF NOT EXISTS idx_annotations_user_id ON public.annotations(user_id);
CREATE INDEX IF NOT EXISTS idx_annotations_page_number ON public.annotations(page_number);

-- Verify the setup
SELECT tablename, policyname FROM pg_policies WHERE tablename = 'annotations';
