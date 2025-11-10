# Database Migration Guide

## Create Documents Table

To fix the PDF loading issue, you need to create the `documents` table in your Supabase database.

### Steps:

1. **Open Supabase SQL Editor**:
   - Go to your Supabase project dashboard
   - Click on "SQL Editor" in the left sidebar

2. **Run the Migration**:
   - Copy the SQL from `supabase/migrations/20251105000000_create_documents_table.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute

   Alternatively, you can copy this SQL directly:

   ```sql
   -- Create documents table
   CREATE TABLE IF NOT EXISTS public.documents (
       id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
       user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
       file_name TEXT NOT NULL,
       file_size BIGINT NOT NULL,
       file_type TEXT NOT NULL,
       storage_path TEXT NOT NULL,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
       updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
   );

   -- Add RLS policies
   ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

   -- Users can view their own documents
   CREATE POLICY "Users can view their own documents"
       ON public.documents
       FOR SELECT
       USING (auth.uid() = user_id);

   -- Users can insert their own documents
   CREATE POLICY "Users can insert their own documents"
       ON public.documents
       FOR INSERT
       WITH CHECK (auth.uid() = user_id);

   -- Users can update their own documents
   CREATE POLICY "Users can update their own documents"
       ON public.documents
       FOR UPDATE
       USING (auth.uid() = user_id);

   -- Users can delete their own documents
   CREATE POLICY "Users can delete their own documents"
       ON public.documents
       FOR DELETE
       USING (auth.uid() = user_id);

   -- Create indexes
   CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
   CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at DESC);
   ```

3. **Verify the Table**:
   - Go to "Table Editor" in the left sidebar
   - You should now see the `documents` table
   - It should have columns: id, user_id, file_name, file_size, file_type, storage_path, created_at, updated_at

### What This Fixes:

- **PDF Loading**: Documents are now saved to the database with metadata
- **Document Management**: Each uploaded document gets a unique ID
- **Navigation**: When you upload a PDF, it navigates to the editor with the document ID
- **URL Loading**: The editor loads the PDF from Supabase storage using the document ID

### After Running the Migration:

1. Restart your dev server (Ctrl+C and `npm run dev`)
2. Upload a PDF file
3. It should automatically navigate to the editor and display the PDF

The loading screen issue was caused by the PDFViewer not receiving a URL to load. Now it will:
1. Get the document ID from the URL (`/editor?id=xxx`)
2. Load the document metadata from the `documents` table
3. Get a signed URL from Supabase storage
4. Load and display the PDF

