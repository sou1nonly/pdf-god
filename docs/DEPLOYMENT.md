# Deployment Guide

This guide covers deploying Lamina with **Vercel (Frontend)** and **Railway (Backend)**.

## Prerequisites

1. GitHub account with this repo pushed
2. [Vercel](https://vercel.com) account (free)
3. [Railway](https://railway.app) account (free tier available)
4. Supabase project already configured

---

## Step 1: Deploy Backend on Railway

### 1.1 Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your `pdf-god` (lamina) repository
4. Railway will auto-detect the `railway.toml` configuration

### 1.2 Configure Environment Variables

In Railway dashboard, go to **Variables** and add:

```env
PORT=3001
NODE_ENV=production

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# AI
GEMINI_API_KEY=your_gemini_api_key

# Security
JWT_SECRET=your_32_char_secret_key
ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
```

### 1.3 Deploy

1. Railway will automatically build using `railway.toml`
2. Once deployed, note your **Railway URL** (e.g., `https://lamina-backend-production.up.railway.app`)
3. Verify by visiting `https://your-railway-url/health`

---

## Step 2: Deploy Frontend on Vercel

### 2.1 Import Project

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New..."** → **"Project"**
3. Select your `pdf-god` (lamina) repository

### 2.2 Configure Build Settings

Vercel should auto-detect settings from `vercel.json`, but verify:

| Setting | Value |
|---------|-------|
| Framework Preset | Vite |
| Root Directory | `./` (root, not frontend) |
| Build Command | Auto-detected from vercel.json |
| Output Directory | Auto-detected from vercel.json |

### 2.3 Configure Environment Variables

Add these in the Vercel dashboard:

```env
VITE_API_URL=https://your-railway-url/api
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 2.4 Deploy

1. Click **"Deploy"**
2. Vercel will build the frontend and deploy
3. Note your **Vercel URL** (e.g., `https://lamina.vercel.app`)

---

## Step 3: Update CORS Settings

After both are deployed, update Railway's `ALLOWED_ORIGINS`:

```env
ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
```

For multiple origins (including localhost for dev):
```env
ALLOWED_ORIGINS=https://your-vercel-app.vercel.app,http://localhost:5173
```

---

## Step 4: Update Supabase Settings

In your Supabase dashboard:

1. Go to **Authentication** → **URL Configuration**
2. Add your Vercel URL to **Site URL**
3. Add to **Redirect URLs**:
   - `https://your-vercel-app.vercel.app`
   - `https://your-vercel-app.vercel.app/login`

---

## Verification Checklist

- [ ] Railway backend health check: `https://your-railway-url/health`
- [ ] Vercel frontend loads: `https://your-vercel-app.vercel.app`
- [ ] User can login (Google OAuth or Guest)
- [ ] File upload works
- [ ] PDF viewer works
- [ ] AI features work

---

## Common Issues

### CORS Errors
- Ensure `ALLOWED_ORIGINS` in Railway includes your Vercel URL
- Don't include trailing slashes

### API Connection Failed
- Verify `VITE_API_URL` in Vercel matches your Railway URL
- Include `/api` at the end: `https://railway-url/api`

### OAuth Not Working
- Update Supabase redirect URLs
- Update Google Cloud Console OAuth redirect URIs

---

## URLs Summary

| Service | URL |
|---------|-----|
| Frontend (Vercel) | `https://your-app.vercel.app` |
| Backend (Railway) | `https://your-backend.up.railway.app` |
| API Endpoint | `https://your-backend.up.railway.app/api` |
| Health Check | `https://your-backend.up.railway.app/health` |
