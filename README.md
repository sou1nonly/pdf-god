# UniPDF Studio

A modern, AI-powered PDF editor and document management system built with React, TypeScript, and Supabase.

## 🚀 Quick Start

```bash
cd uni-pdf-studio-main
npm install
npm run dev
```

Visit http://localhost:8080 (or the port shown in terminal)

## 📁 Project Structure

```
pdf-god/
├── uni-pdf-studio-main/          # Main application source code
│   ├── src/                       # React + TypeScript source
│   │   ├── components/            # UI components
│   │   ├── pages/                 # Page components
│   │   ├── contexts/              # React contexts (Auth, etc.)
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── lib/                   # Utility libraries
│   │   └── integrations/          # Supabase integration
│   ├── supabase/                  # Supabase migrations
│   └── public/                    # Static assets
│
├── docs/                          # Documentation
│   ├── setup/                     # Setup guides
│   │   ├── SETUP-CHECKLIST.md     # Complete setup checklist
│   │   ├── DATABASE-MIGRATION.md  # Database setup guide
│   │   ├── GOOGLE-AUTH-SETUP.md   # OAuth configuration
│   │   └── SUPABASE-STORAGE-SETUP.md
│   │
│   ├── sprints/                   # Sprint documentation
│   │   ├── README-SPRINT-SYSTEM.md
│   │   ├── SPRINT-1-COMPLETE.md
│   │   ├── SPRINT-2-COMPLETE.md
│   │   └── documentation/         # Detailed sprint docs
│   │       ├── SPRINT-MASTER.md
│   │       ├── SPRINT-CHANGELOG.md
│   │       └── steps/             # Individual sprint files
│   │
│   ├── scripts/                   # Utility scripts
│   │   ├── sprint-status.js
│   │   ├── sync-sprints.js
│   │   └── validate-sprints.js
│   │
│   └── testing/                   # Test documentation
│       └── Testing/
│
├── package.json                   # Root package.json
└── README.md                      # This file
```

## ✨ Features

### ✅ Completed (Sprint 1 & 2)

- 🔐 **Authentication**: Google OAuth integration with Supabase Auth
- 📤 **File Upload**: Drag & drop with format conversion support
- 📄 **PDF Rendering**: High-quality PDF.js viewer with zoom and navigation
- 🗂️ **Document Management**: List, search, and organize documents
- 🔄 **Format Conversion**: Auto-convert DOCX, images, and more to PDF
- 💾 **Cloud Storage**: Secure Supabase storage with RLS policies
- 🎨 **Modern UI**: Tailwind CSS + shadcn/ui components

### 🚧 In Progress (Sprint 3)

- ✏️ PDF Editing Tools (annotations, text, shapes)
- 🤖 AI-Powered Features (summarization, chat)
- 🔍 OCR & Text Extraction
- 👥 Collaboration Features

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS v3 + shadcn/ui
- **Backend**: Supabase (Auth, Storage, Database)
- **PDF**: PDF.js v5.4.394
- **State**: React Context API + TanStack Query
- **Routing**: React Router v6

## 📚 Documentation

### Setup Guides

- **[Setup Checklist](docs/setup/SETUP-CHECKLIST.md)** - Complete setup instructions
- **[Database Migration](docs/setup/DATABASE-MIGRATION.md)** - Database table creation
- **[Google Auth Setup](docs/setup/GOOGLE-AUTH-SETUP.md)** - OAuth configuration
- **[Supabase Storage](docs/setup/SUPABASE-STORAGE-SETUP.md)** - Storage bucket setup

### Sprint Documentation

- **[Sprint System Overview](docs/sprints/README-SPRINT-SYSTEM.md)** - How sprints work
- **[Sprint Master](docs/sprints/documentation/SPRINT-MASTER.md)** - Central sprint control
- **[Sprint Changelog](docs/sprints/documentation/SPRINT-CHANGELOG.md)** - Change history

## 🔧 Development

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Google Cloud Console account (for OAuth)

### Environment Setup

1. Copy `.env.example` to `.env` in `uni-pdf-studio-main/`
2. Add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### Database Setup

Run the SQL migration in Supabase SQL Editor:
```sql
-- See docs/setup/DATABASE-MIGRATION.md for full SQL
```

### Run Development Server

```bash
cd uni-pdf-studio-main
npm run dev
```

### Build for Production

```bash
cd uni-pdf-studio-main
npm run build
```

## 🧪 Testing

Test files and documentation are in `docs/testing/`

## 📖 Sprint System

This project uses a structured sprint system for development tracking:

- **Sprint 1**: Project Setup & Foundation ✅ (29 points)
- **Sprint 2**: File Upload & PDF Rendering ✅ (31 points)
- **Sprint 3**: PDF Editing Tools 🚧 (39 points)
- **Sprint 4**: AI-Powered Features 📋 (36 points)
- **Sprint 5**: OCR & File Management 📋 (39 points)
- **Sprint 6**: Collaboration & Cloud 📋 (39 points)
- **Sprint 7**: Polish, Testing & Deployment 📋 (42 points)

**Total**: 255 story points

See `docs/sprints/documentation/SPRINT-MASTER.md` for details.

## 🎯 Current Status

- **Sprint 1**: ✅ Complete (Authentication, Project Setup)
- **Sprint 2**: ✅ Complete (File Upload, PDF Rendering, Format Conversion)
- **Next**: Sprint 3 - PDF Editing Tools

## 🤝 Contributing

This is a personal project, but contributions are welcome!

## 📄 License

All rights reserved - 2025

## 🆘 Support

For issues and questions:
1. Check `docs/setup/SETUP-CHECKLIST.md`
2. Review sprint documentation in `docs/sprints/`
3. Check browser console for errors

---

**Last Updated**: November 5, 2025  
**Version**: Sprint 2 Complete  
**Status**: Active Development 🚀
