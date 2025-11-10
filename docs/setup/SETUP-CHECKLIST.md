# Setup Checklist - UniPDF Studio

## ✅ What's Already Done

- ✅ Google OAuth authentication implemented
- ✅ File upload with format conversion
- ✅ PDF rendering system
- ✅ Document list display
- ✅ TypeScript compilation errors fixed
- ✅ Upload flow corrected to wait for completion

## 🔧 What You Need to Do Now

### Step 1: Create the Documents Table in Supabase

**Why this is needed:** The app saves document metadata to a database table so it can:
- Track which documents belong to which user
- Generate URLs to load PDFs in the editor
- Manage document metadata (filename, size, etc.)

**How to do it:**

1. Go to your Supabase project dashboard
2. Click "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy and paste this SQL:

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

5. Click "Run" (or press Ctrl+Enter)
6. You should see "Success. No rows returned" ✅

**Verify it worked:**
- Go to "Table Editor" in the left sidebar
- You should see a new table called `documents`
- Click on it to see the columns

### Step 2: Verify Storage Bucket Configuration

The storage bucket should already exist, but let's make sure:

1. Go to "Storage" in your Supabase dashboard
2. You should see a bucket called `documents`
3. If it doesn't exist, create it:
   - Click "New bucket"
   - Name: `documents`
   - Public: ❌ (keep it private)
   - Click "Create bucket"

### Step 3: Test the Complete Flow

Now restart your dev server and test:

```bash
# Stop the current server (Ctrl+C if running)
cd uni-pdf-studio-main
npm run dev
```

**Test steps:**

1. ✅ **Login**: Go to http://localhost:8080
   - Should redirect to /login
   - Click "Sign in with Google"
   - Complete Google authentication
   - Should redirect back to home page

2. ✅ **Upload**: On the home page
   - Drag and drop a PDF or click "Choose Files"
   - Wait for "Upload complete!" message
   - Should automatically navigate to the editor

3. ✅ **View PDF**: In the editor
   - PDF should load and display
   - No more "Loading PDF..." stuck screen
   - You can zoom, pan, and navigate pages

4. ✅ **Check Storage**: In Supabase dashboard
   - Go to Storage → documents bucket
   - You should see a folder with your user ID
   - Inside should be your uploaded PDF

5. ✅ **Check Database**: In Supabase dashboard
   - Go to Table Editor → documents
   - You should see a row with your document metadata

## 🎯 What's Fixed

### Issue 1: "Loading PDF..." Stuck Screen
**Root Cause:** PDFViewer wasn't receiving a URL to load
**Fix:** 
- EditorPage now reads document ID from URL (`?id=xxx`)
- Loads document metadata from database
- Gets signed URL from storage
- Passes URL to PDFViewer

### Issue 2: Not Navigating to Editor
**Root Cause:** Navigation happened before upload completed
**Fix:**
- FileUploadZone now waits for all uploads to finish
- Only calls `onUploadComplete` after documentId is set
- HomePage navigates with the correct document ID

### Issue 3: TypeScript Errors
**Root Cause:** Missing table types, incorrect props
**Fix:**
- Added `maxSizeMB` to FileUploadZoneProps
- Used `(supabase as any)` for documents table until types are generated
- All compilation errors resolved

## 📝 Technical Flow

Here's how the complete upload → view flow works now:

```
1. User uploads PDF on HomePage
   ↓
2. FileUploadZone:
   - Uploads file to Supabase Storage (path: user_id/filename)
   - Calls saveFileMetadata() to create database record
   - Returns documentId to parent
   ↓
3. HomePage:
   - Receives uploadedFiles with documentId
   - Navigates to /editor?id=<documentId>
   ↓
4. EditorPage:
   - Reads id from URL query params
   - Queries documents table for metadata
   - Calls storage.createSignedUrl() to get temporary URL
   - Passes URL to PDFViewer
   ↓
5. PDFViewer:
   - Loads PDF from signed URL
   - Renders pages using PDF.js
   - User can view and edit!
```

## 🚨 Common Issues & Solutions

### "No document selected" error
- **Cause:** Document ID not in URL or user not logged in
- **Solution:** Make sure you're logged in and the URL has `?id=...`

### "Document not found" error
- **Cause:** Database query failed or document doesn't exist
- **Solution:** Check Supabase logs, verify documents table was created

### "Failed to get document URL" error
- **Cause:** Storage permissions or file doesn't exist
- **Solution:** Check RLS policies on storage bucket, verify file was uploaded

### PDF still shows "Loading PDF..."
- **Cause:** PDF.js can't load the URL
- **Solution:** Check browser console for errors, verify signed URL is valid

## ✨ Next Steps

Once everything is working:

1. **Test with different file formats**: Try uploading DOCX, images, etc.
2. **Test the editing tools**: Use the toolbar to add annotations
3. **Test on mobile**: Check responsive layout
4. **Generate TypeScript types**: Run Supabase CLI to generate proper types
5. **Continue to Sprint 3**: Implement PDF editing features

## 🆘 Need Help?

If you're still stuck:
1. Check the browser console for errors (F12 → Console)
2. Check Supabase logs (Dashboard → Logs)
3. Verify all steps above were completed
4. Check that Google OAuth is properly configured

---

**Last Updated:** November 5, 2025
**Status:** Ready for testing after database migration

