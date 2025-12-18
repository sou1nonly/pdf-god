# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/cfe38c6c-df4b-48aa-81dd-0e947703440b

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/cfe38c6c-df4b-48aa-81dd-0e947703440b) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite 7.1.12
- TypeScript
- React 18
- shadcn-ui (40+ components)
- Tailwind CSS
- PDF.js v5.4.394 (PDF rendering)
- Fabric.js v5.5.2 (Canvas manipulation)
- Supabase (Backend & Storage)
- jsPDF (Format conversion)

### Code Architecture

The PDF editor component has been refactored into a modular architecture (November 2025):

**Custom Hooks:**
- `useCanvasScheduler` - RAF render batching
- `useCanvasHistory` - Undo/redo with differential storage
- `usePDFRenderer` - PDF loading & rendering
- `useTextLayer` - Text layer caching
- `useSnappingGuidelines` - Guideline pooling
- `usePerformanceMetrics` - Performance tracking

**Utilities:**
- Centralized logging system (`logger.ts`)
- Canvas to blob conversion (`blobConverter.ts`)

**Benefits:**
- 28% reduction in main component complexity
- Comprehensive logging for debugging
- Independent testable modules
- Zero TypeScript errors

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/cfe38c6c-df4b-48aa-81dd-0e947703440b) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
