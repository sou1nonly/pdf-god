# Google Authentication Setup Guide

## Step 1: Configure Google OAuth in Supabase

### 1.1 Go to Supabase Dashboard
Open: https://supabase.com/dashboard/project/aejwjvmdvzugjmgozlwv/auth/providers

### 1.2 Enable Google Provider
1. Scroll to **Google** provider
2. Toggle it **ON**

### 1.3 Get Google OAuth Credentials

#### Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Google+ API**

#### Create OAuth 2.0 Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Configure OAuth consent screen if prompted:
   - User Type: **External**
   - App name: `UniPDF Studio`
   - User support email: Your email
   - Developer contact: Your email
   - Add scopes: `email`, `profile`, `openid`
   - Add test users (your email)

4. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: `UniPDF Studio`
   - Authorized JavaScript origins:
     ```
     http://localhost:8080
     https://aejwjvmdvzugjmgozlwv.supabase.co
     ```
   - Authorized redirect URIs:
     ```
     https://aejwjvmdvzugjmgozlwv.supabase.co/auth/v1/callback
     ```

5. **Copy** the Client ID and Client Secret

### 1.4 Add Credentials to Supabase
1. Back in Supabase → Authentication → Providers → Google
2. Paste **Client ID**
3. Paste **Client Secret**
4. Click **Save**

---

## Step 2: Update RLS Policies (Fix Document Upload)

Run this SQL in Supabase SQL Editor:

```sql
-- Drop old policies
DROP POLICY IF EXISTS "Allow all inserts for testing" ON documents;
DROP POLICY IF EXISTS "Allow all selects for testing" ON documents;
DROP POLICY IF EXISTS "Allow all updates for testing" ON documents;
DROP POLICY IF EXISTS "Allow all deletes for testing" ON documents;

-- Create proper authenticated policies
CREATE POLICY "Users can insert own documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own documents"
  ON documents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON documents FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

---

## Step 3: Test Authentication

1. **Restart dev server**:
   ```bash
   npm run dev
   ```

2. **Open app**: http://localhost:8080/

3. **You should see**:
   - Login page with "Continue with Google" button

4. **Click "Continue with Google"**:
   - Google OAuth popup appears
   - Select your Google account
   - Grant permissions
   - Redirects back to app

5. **Verify logged in**:
   - Top-right corner shows your profile picture/initials
   - Click avatar to see dropdown with your email
   - Can sign out

6. **Test file upload**:
   - Should work without RLS errors
   - Files are tied to your user ID

---

## Troubleshooting

### "Unauthorized client" error
- Check redirect URI matches exactly in Google Console
- Make sure to use the full Supabase auth callback URL

### "Access blocked" error
- Add your email to test users in OAuth consent screen
- Or publish the app (moves from Testing to Production)

### Still getting RLS errors
- Verify you're logged in (check top-right avatar)
- Run the SQL policies above
- Check browser console for auth errors

### OAuth popup blocked
- Allow popups for localhost in browser settings
- Try different browser

---

## Production Setup (Later)

For production deployment:

1. Add production domain to:
   - Google Console authorized origins
   - Google Console redirect URIs
   - Supabase Site URL setting

2. Update OAuth consent screen:
   - Submit for verification if needed
   - Move from Testing to Production

3. Update `.env` file with production URLs

---

## Quick Reference

**Supabase Project**: aejwjvmdvzugjmgozlwv  
**Auth Callback**: https://aejwjvmdvzugjmgozlwv.supabase.co/auth/v1/callback  
**Local Dev**: http://localhost:8080/

**Next Steps After Setup**:
1. Test Google login ✓
2. Test file upload ✓
3. Test document viewing ✓
4. Continue with Sprint 2 testing ✓
