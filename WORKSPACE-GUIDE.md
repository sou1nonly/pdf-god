# 📂 Workspace Organization - Quick Reference

## Root Directory Structure

```
pdf-god/
├── 📱 uni-pdf-studio-main/     # Main application (React + TypeScript)
├── 📚 docs/                    # All documentation (organized)
├── 📦 package.json             # Root dependencies (sprint scripts)
├── 📖 README.md                # Project overview
└── .git/                       # Git repository
```

## Documentation Organization

### 🔧 Setup Documentation (`docs/setup/`)

Essential setup guides for getting started:

| File | Purpose | When to Use |
|------|---------|-------------|
| `SETUP-CHECKLIST.md` | Complete setup guide | Start here for full setup |
| `DATABASE-MIGRATION.md` | Create documents table | Before first upload |
| `GOOGLE-AUTH-SETUP.md` | Configure OAuth | Before testing auth |
| `SUPABASE-STORAGE-SETUP.md` | Setup storage bucket | If storage errors occur |
| `INSTALLATION-COMPLETE.md` | Initial setup notes | Reference only |

**Quick Start**: Read `SETUP-CHECKLIST.md` first!

---

### 📋 Sprint Documentation (`docs/sprints/`)

Project progress tracking and sprint details:

| File/Folder | Purpose |
|-------------|---------|
| `README-SPRINT-SYSTEM.md` | How the sprint system works |
| `SPRINT-1-COMPLETE.md` | Sprint 1 summary and completion |
| `SPRINT-2-COMPLETE.md` | Sprint 2 summary and completion |
| `SPRINT-QUICK-REFERENCE.md` | Quick sprint commands |
| `SPRINT-SYSTEM-OVERVIEW.md` | Detailed sprint methodology |
| `documentation/` | Detailed sprint tracking files |
| `documentation/SPRINT-MASTER.md` | **Master sprint control panel** |
| `documentation/SPRINT-CHANGELOG.md` | All sprint changes logged |
| `documentation/steps/` | Individual sprint breakdown files |

**Central Control**: `documentation/SPRINT-MASTER.md` is the main sprint file!

---

### 🔨 Scripts (`docs/scripts/`)

Utility scripts for sprint management:

| Script | Purpose | Usage |
|--------|---------|-------|
| `sprint-status.js` | Check sprint progress | `npm run sprint:status` |
| `sync-sprints.js` | Sync sprint files | `npm run sync-sprints` |
| `validate-sprints.js` | Validate sprint data | `npm run validate-sprints` |
| `setup-sprint-system.sh` | Initial sprint setup | One-time setup |

---

### 🧪 Testing (`docs/testing/`)

Test documentation and test files:

```
docs/testing/
└── Testing/
    └── test1-file-upload-pdf.md
```

---

## Quick Navigation

### I want to...

**🚀 Start the app**
```bash
cd uni-pdf-studio-main
npm run dev
```

**🔧 Setup from scratch**
→ Read: `docs/setup/SETUP-CHECKLIST.md`

**📊 Check sprint progress**
→ Read: `docs/sprints/documentation/SPRINT-MASTER.md`
→ Or run: `npm run sprint:status`

**🐛 Fix authentication issues**
→ Read: `docs/setup/GOOGLE-AUTH-SETUP.md`

**💾 Setup database**
→ Read: `docs/setup/DATABASE-MIGRATION.md`

**📝 See what's completed**
→ Read: `docs/sprints/SPRINT-1-COMPLETE.md`
→ Read: `docs/sprints/SPRINT-2-COMPLETE.md`

**🔄 Sync sprint files**
```bash
npm run sync-sprints
```

---

## Application Structure (`uni-pdf-studio-main/`)

```
uni-pdf-studio-main/
├── src/
│   ├── components/         # React components
│   │   ├── auth/           # Authentication components
│   │   ├── document/       # PDF viewer, document list
│   │   ├── layout/         # Layout components (TopBar, Sidebar)
│   │   ├── ui/             # shadcn/ui components
│   │   └── upload/         # File upload components
│   │
│   ├── pages/              # Page components
│   │   ├── HomePage.tsx    # Landing page with upload
│   │   ├── EditorPage.tsx  # PDF editor
│   │   └── LoginPage.tsx   # Google OAuth login
│   │
│   ├── contexts/           # React contexts
│   │   └── AuthContext.tsx # Authentication state
│   │
│   ├── lib/                # Utility libraries
│   │   ├── storage.ts      # Supabase storage helpers
│   │   └── format-converter.ts  # File conversion
│   │
│   └── integrations/
│       └── supabase/       # Supabase client & types
│
├── supabase/
│   └── migrations/         # Database migrations
│
└── public/                 # Static assets
```

---

## Key Files to Know

### Configuration
- `uni-pdf-studio-main/.env` - Environment variables (Supabase keys)
- `uni-pdf-studio-main/vite.config.ts` - Vite configuration
- `uni-pdf-studio-main/tailwind.config.ts` - Tailwind CSS config

### Core Code
- `src/App.tsx` - Main app with routing
- `src/contexts/AuthContext.tsx` - Authentication logic
- `src/pages/EditorPage.tsx` - PDF editor page
- `src/components/document/PDFViewer.tsx` - PDF rendering

### Documentation
- `README.md` - Project overview (you are here)
- `docs/setup/SETUP-CHECKLIST.md` - Setup guide
- `docs/sprints/documentation/SPRINT-MASTER.md` - Sprint control

---

## Clean vs Messy Before/After

### ❌ Before (Messy Root)
```
pdf-god/
├── DATABASE-MIGRATION.md
├── GOOGLE-AUTH-SETUP.md
├── INSTALLATION-COMPLETE.md
├── SETUP-CHECKLIST.md
├── SUPABASE-STORAGE-SETUP.md
├── SPRINT-1-COMPLETE.md
├── SPRINT-1-SUMMARY.txt
├── SPRINT-2-COMPLETE.md
├── SPRINT-QUICK-REFERENCE.md
├── SPRINT-SYSTEM-OVERVIEW.md
├── README-SPRINT-SYSTEM.md
├── Testing/
├── documentation/
├── scripts/
└── uni-pdf-studio-main/
```

### ✅ After (Clean & Organized)
```
pdf-god/
├── 📖 README.md               # Clear project overview
├── 📚 docs/                   # All docs organized
│   ├── setup/                 # Setup guides
│   ├── sprints/               # Sprint tracking
│   ├── scripts/               # Utility scripts
│   └── testing/               # Test docs
└── 📱 uni-pdf-studio-main/    # Clean app code
```

---

## NPM Scripts (Root Level)

Run from `/home/neconoo/Documents/projects/pdf-god/`:

```bash
npm run sprint:status      # Check current sprint status
npm run sync-sprints       # Sync all sprint files
npm run validate-sprints   # Validate sprint data
```

## NPM Scripts (App Level)

Run from `uni-pdf-studio-main/`:

```bash
npm run dev               # Start dev server
npm run build             # Build for production
npm run preview           # Preview production build
npm run lint              # Run ESLint
```

---

## 📌 Most Important Files

1. **`README.md`** - Start here!
2. **`docs/setup/SETUP-CHECKLIST.md`** - Setup guide
3. **`docs/sprints/documentation/SPRINT-MASTER.md`** - Sprint tracking
4. **`uni-pdf-studio-main/src/App.tsx`** - App entry point

---

**Last Updated**: November 5, 2025  
**Organization**: Complete ✅  
**Ready For**: Development & Testing 🚀
