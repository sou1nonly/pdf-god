# Quick Fix: Documents Not Showing

## The Problem

The error shows: **"Could not find the 'file_type' column"**

This means the `documents` table in Supabase is missing the `file_type` column.

## The Solution

### Step 1: Run This SQL in Supabase

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor** (left sidebar)
3. Click **"New Query"**
4. Copy and paste the SQL from `docs/setup/FIX-DOCUMENTS-TABLE.sql`
5. Click **"Run"** (or press Ctrl+Enter)

**OR** run this directly:

```sql
-- Add file_type column if missing
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS file_type TEXT NOT NULL DEFAULT 'application/pdf';

-- Verify it worked
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'documents';
```

### Step 2: Verify the Fix

After running the SQL, you should see output like:

```
column_name    | data_type
---------------|----------
id             | uuid
user_id        | uuid
file_name      | text
file_size      | bigint
file_type      | text        ← This should now exist!
storage_path   | text
created_at     | timestamp with time zone
updated_at     | timestamp with time zone
```

### Step 3: Test Upload Again

1. Go back to your app (http://localhost:8080)
2. Upload a new PDF file
3. Documents should now save correctly
4. They should appear in "My Documents"

## Why This Happened

The original migration might not have been run completely, or the table was created manually without all columns. The fix script adds the missing column safely.

## Still Having Issues?

### Check if table exists:
```sql
SELECT * FROM public.documents;
```

### Check RLS policies:
```sql
SELECT * FROM pg_policies WHERE tablename = 'documents';
```

### Clear old broken uploads:
```sql
-- Only if you want to start fresh
TRUNCATE TABLE public.documents;
```

---

**Once you run the SQL, refresh your app and try uploading again!** 🚀
