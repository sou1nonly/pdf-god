# Login & Session Troubleshooting Guide

## Issue: Login Failing or Not Persisting

### Quick Checks:

1. **Check Browser Console**
   - Open DevTools (F12) → Console tab
   - Look for any Supabase errors
   - Look for "Supabase environment variables" message

2. **Check LocalStorage**
   - Open DevTools (F12) → Application tab → Local Storage
   - Look for key: `unipdf-studio-auth`
   - Should contain session data if logged in

3. **Check Google OAuth Configuration**
   - Supabase Dashboard → Authentication → Providers → Google
   - Verify Client ID and Secret are set
   - Check "Authorized redirect URIs" includes your URL

### Common Issues & Fixes:

#### Issue 1: "Failed to sign in" Error
**Cause**: Google OAuth not configured
**Fix**: 
- Go to Supabase Dashboard → Authentication → Providers
- Enable Google provider
- Add Client ID and Client Secret from Google Cloud Console
- See `docs/setup/GOOGLE-AUTH-SETUP.md` for details

#### Issue 2: Stuck on Login Page After Google Auth
**Cause**: Redirect URL mismatch
**Fix**:
- In Google Cloud Console, add these to "Authorized redirect URIs":
  ```
  https://zgakefwngevuosomwyqr.supabase.co/auth/v1/callback
  http://localhost:8080
  http://localhost:8081
  ```

#### Issue 3: Session Not Persisting (Need to Login Again)
**Cause**: Browser blocking cookies/localStorage
**Fix**:
- Check if browser is blocking third-party cookies
- Try in incognito/private mode to rule out extensions
- Clear browser cache and localStorage
- Session should now persist with `storageKey: 'unipdf-studio-auth'`

#### Issue 4: Environment Variables Not Found
**Cause**: `.env` file not loaded
**Fix**:
- Verify `.env` exists in `uni-pdf-studio-main/`
- Restart dev server: `npm run dev`
- Check console for "Supabase environment variables are not set!"

### Testing Login Flow:

1. **Start Dev Server**
   ```bash
   cd uni-pdf-studio-main
   npm run dev
   ```

2. **Open Browser**
   - Go to http://localhost:8080
   - Should redirect to `/login` if not logged in

3. **Click "Continue with Google"**
   - Should open Google OAuth popup
   - Select your Google account
   - Should redirect back to home page
   - Should see your avatar/name in top-right

4. **Verify Session Persistence**
   - Close browser tab
   - Open http://localhost:8080 again
   - Should NOT redirect to login (already logged in)
   - Should see your profile in navbar

### Debug Commands:

Open browser console (F12) and run:

```javascript
// Check if Supabase is loaded
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);

// Check current session
const { data: { session } } = await supabase.auth.getSession();
console.log('Current session:', session);

// Check user
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user);

// Check localStorage
console.log('Auth storage:', localStorage.getItem('unipdf-studio-auth'));
```

### Session Configuration:

The app is now configured with:
- ✅ **persistSession: true** - Session saved to localStorage
- ✅ **autoRefreshToken: true** - Tokens refresh automatically
- ✅ **detectSessionInUrl: true** - Reads session from OAuth redirect
- ✅ **storageKey: 'unipdf-studio-auth'** - Custom storage key

This means:
- Session persists across browser restarts
- Token refreshes before expiry (no sudden logouts)
- OAuth redirect properly handled
- Multiple UniPDF tabs share same session

### Still Not Working?

1. **Clear everything and try again**:
   ```javascript
   // In browser console:
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```

2. **Check Supabase Dashboard**:
   - Go to Authentication → Users
   - See if your account appears after login attempt
   - Check Logs for any auth errors

3. **Check Network Tab**:
   - Open DevTools → Network tab
   - Click "Continue with Google"
   - Look for failed requests to Supabase
   - Check response messages

4. **Verify Google Cloud Console**:
   - OAuth consent screen configured
   - Authorized redirect URIs match exactly
   - OAuth 2.0 Client ID created

---

**Updated**: November 5, 2025
**Status**: Session persistence enabled ✅
