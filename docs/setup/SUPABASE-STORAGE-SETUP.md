# Supabase Storage Setup Guide

## Issue
❌ **Bucket not found error** - The storage bucket needs to be created in Supabase dashboard.

---

## Quick Fix Steps

### 1. Go to Supabase Dashboard
Open: https://supabase.com/dashboard/project/aejwjvmdvzugjmgozlwv

### 2. Create Storage Bucket
1. Click on **Storage** in left sidebar
2. Click **New bucket** button
3. Configure bucket:
   - **Name**: `documents`
   - **Public bucket**: ✅ Yes (check this box)
   - **File size limit**: 100 MB
   - **Allowed MIME types**: Leave empty (allow all)
4. Click **Create bucket**

### 3. Set Storage Policies
1. Click on the `documents` bucket
2. Click **Policies** tab
3. Click **New policy**
4. Create these policies:

#### Policy 1: Allow authenticated users to upload
```sql
CREATE POLICY "Users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');
```

#### Policy 2: Allow public read access
```sql
CREATE POLICY "Public can read documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'documents');
```

#### Policy 3: Allow users to delete their own files
```sql
CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');
```

### 4. Verify Database Tables
1. Click **SQL Editor** in left sidebar
2. Run this query to check if tables exist:
```sql
SELECT * FROM documents LIMIT 1;
```

If error, run the migrations:

#### Migration 1: Initial Schema
```sql
-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  size BIGINT NOT NULL,
  type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  storage_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Documents policies
CREATE POLICY "Users can view own documents"
  ON documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON documents FOR DELETE
  USING (auth.uid() = user_id);

-- Create document_versions table
CREATE TABLE IF NOT EXISTS document_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES documents ON DELETE CASCADE NOT NULL,
  version_number INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  changes JSONB,
  created_by UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

-- Document versions policies
CREATE POLICY "Users can view versions of own documents"
  ON document_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_versions.document_id
      AND documents.user_id = auth.uid()
    )
  );

-- Create annotations table
CREATE TABLE IF NOT EXISTS annotations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES documents ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  page_number INTEGER NOT NULL,
  type TEXT NOT NULL,
  content JSONB NOT NULL,
  position JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;

-- Annotations policies
CREATE POLICY "Users can view annotations on accessible documents"
  ON annotations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = annotations.document_id
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create annotations on own documents"
  ON annotations FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = annotations.document_id
      AND documents.user_id = auth.uid()
    )
  );
```

### 5. Test the Upload
1. Refresh your browser (F5)
2. Try uploading a PDF file again
3. Check browser console (F12) for any remaining errors

---

## Alternative: Run Migrations via SQL Editor

Copy the entire content from `/supabase/migrations/001_initial_schema.sql` and paste it into SQL Editor, then run it.

---

## Troubleshooting

### Still getting "bucket not found"?
- Make sure bucket name is exactly: `documents`
- Ensure bucket is set to **public**
- Check you're logged into Supabase

### Files upload but don't show?
- Check `documents` table exists
- Verify RLS policies are applied
- Check browser console for errors

### PDF not rendering?
- Verify file uploaded to storage bucket
- Check storage URL is accessible
- Ensure PDF.js is loaded (check Network tab)

---

## Quick Test Query

Run this in SQL Editor to check everything:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'documents', 'document_versions', 'annotations');

-- Check if bucket exists
SELECT * FROM storage.buckets WHERE id = 'documents';

-- Check storage policies
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
```

Expected results:
- 4 tables found
- 1 bucket named 'documents'
- Multiple storage policies

---

**After completing these steps, test again!**
