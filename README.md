# UniPDF Studio

A modern, AI-powered PDF editor and document management system built with a separated **backend/frontend architecture** using **MVC micromodular design**.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start both backend and frontend
npm run dev
```

- **Backend API**: http://localhost:3001
- **Frontend App**: http://localhost:5173

## 📁 Project Structure

```
pdf-god/
├── backend/                        # Node.js Express API
│   ├── src/
│   │   ├── app.ts                  # Express app entry
│   │   ├── config/                 # Environment & Supabase config
│   │   ├── middleware/             # Auth, error, validation
│   │   └── modules/                # MVC modules
│   │       ├── auth/               # Authentication
│   │       ├── documents/          # Document CRUD
│   │       ├── annotations/        # PDF annotations
│   │       ├── storage/            # File storage
│   │       ├── ai/                 # AI features (Gemini)
│   │       └── convert/            # File conversion
│   └── .env.example
│
├── frontend/                       # React + Vite App
│   ├── src/
│   │   ├── api/                    # API client layer
│   │   ├── components/             # UI components
│   │   ├── hooks/                  # React hooks (including API hooks)
│   │   ├── pages/                  # Page components
│   │   └── lib/                    # Utilities
│   └── .env.example
│
├── shared/                         # Shared TypeScript types
│   └── src/
│       ├── models.ts               # Data models
│       └── api.ts                  # API types
│
└── docs/                           # Documentation
    └── setup/                      # Setup guides
```

## ✨ Features

### Core Features
- 🔐 **Authentication**: Google OAuth + Anonymous sign-in
- 📤 **File Upload**: Drag & drop with progress tracking
- 📄 **PDF Rendering**: PDF.js viewer with zoom and navigation
- ✏️ **Annotations**: Drawing, shapes, text on PDF pages
- 🗂️ **Document Management**: List, search, organize documents
- 🔄 **Format Conversion**: Images and text to PDF
- 💾 **Cloud Storage**: Supabase storage with RLS

### AI Features (Gemini-powered)
- 💬 **Chat**: Ask questions about your documents
- 📝 **Summarize**: Generate brief or detailed summaries
- ✍️ **Rewrite**: Transform text in different tones
- ❓ **Questions**: Auto-generate relevant questions
- 🔍 **Extract**: Pull key topics, points, and entities

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js + TypeScript
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Gemini API
- **Validation**: Zod
- **Security**: Helmet, CORS, Rate limiting

### Frontend
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: TanStack Query (React Query)
- **Routing**: React Router v6
- **PDF**: PDF.js + pdf-lib

### Shared
- **Types**: TypeScript interfaces shared between BE/FE
- **Package**: @unipdf/shared (workspace)

## 🔧 Development Setup

### Prerequisites

- Node.js 18+
- npm
- Supabase account
- Google Cloud Console account (for OAuth)
- Google AI Studio account (for Gemini API)

### Environment Setup

1. **Backend** - Copy `backend/.env.example` to `backend/.env`:
   ```env
   PORT=3001
   NODE_ENV=development
   
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_KEY=your_service_role_key
   SUPABASE_ANON_KEY=your_anon_key
   
   GEMINI_API_KEY=your_gemini_api_key
   
   JWT_SECRET=your_32_char_secret_key
   ALLOWED_ORIGINS=http://localhost:5173
   ```

2. **Frontend** - Copy `frontend/.env.example` to `frontend/.env`:
   ```env
   VITE_API_URL=http://localhost:3001/api
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

### Run Development

```bash
# Install all dependencies (runs postinstall to build shared types)
npm install

# Start both backend and frontend
npm run dev

# Or start separately:
npm run dev:backend   # Backend on http://localhost:3001
npm run dev:frontend  # Frontend on http://localhost:5173
```

### Build for Production

```bash
npm run build
```

## 📡 API Endpoints

### Authentication (`/api/auth`)
- `GET /me` - Get current user
- `POST /google` - Google OAuth
- `POST /anonymous` - Anonymous sign-in
- `POST /refresh` - Refresh token
- `POST /logout` - Sign out

### Documents (`/api/documents`)
- `GET /` - List documents (paginated)
- `GET /:id` - Get document
- `POST /` - Create document
- `PATCH /:id` - Update document
- `DELETE /:id` - Delete document

### Annotations (`/api/documents/:id/annotations`)
- `GET /` - Get all annotations
- `GET /:page` - Get page annotations
- `POST /` - Save annotations
- `DELETE /:page` - Delete page annotations

### Storage (`/api/storage`)
- `POST /upload` - Upload file
- `GET /download/*` - Download file
- `GET /signed-url/*` - Get signed URL

### AI (`/api/ai`)
- `POST /chat` - Chat with document
- `POST /summarize` - Summarize
- `POST /rewrite` - Rewrite text
- `POST /questions` - Generate questions
- `POST /extract` - Extract key info

### Convert (`/api/convert`)
- `POST /image` - Image to PDF
- `POST /text` - Text to PDF
- `POST /document` - DOC to PDF

## 📚 Documentation

- **[Setup Checklist](docs/setup/SETUP-CHECKLIST.md)** - Complete setup
- **[Database Migration](docs/setup/DATABASE-MIGRATION.md)** - DB setup
- **[Google Auth Setup](docs/setup/GOOGLE-AUTH-SETUP.md)** - OAuth config
- **[Supabase Storage](docs/setup/SUPABASE-STORAGE-SETUP.md)** - Storage setup

## 🏗️ Architecture

The application follows a clean **MVC micromodular architecture**:

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend                            │
│  React + Vite + TailwindCSS + shadcn/ui                 │
│  API Client Layer → React Query Hooks                    │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTP/REST
┌─────────────────────▼───────────────────────────────────┐
│                      Backend                             │
│  Express.js + TypeScript                                │
│  ├── Middleware (Auth, Validation, Error Handling)      │
│  └── Modules (Auth, Documents, Annotations, Storage,    │
│               AI, Convert)                               │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                    Supabase                              │
│  PostgreSQL + Auth + Storage + RLS                      │
└─────────────────────────────────────────────────────────┘
```

Each backend module follows the MVC pattern:
- `types.ts` - Validation schemas & types
- `service.ts` - Business logic
- `controller.ts` - HTTP handlers
- `routes.ts` - Express routes

## 📄 License

All rights reserved - 2025

---

**Last Updated**: December 18, 2025  
**Version**: 2.0.0 (MVC Architecture)  
**Status**: Active Development 🚀
