import { create } from 'zustand';
import { ProcessedPage, SemanticBlock } from '@/types/semantic';

interface DocumentState {
  pages: ProcessedPage[];
  isDirty: boolean; // Has the document been modified?
  
  // Actions
  setDocument: (pages: ProcessedPage[]) => void;
  updateBlockContent: (pageIndex: number, sectionId: string, blockId: string, newContent: string) => void;
  reset: () => void;
}

export const useDocumentStore = create<DocumentState>((set) => ({
  pages: [],
  isDirty: false,

  setDocument: (pages) => set({ pages, isDirty: false }),

  updateBlockContent: (pageIndex, sectionId, blockId, newContent) => 
    set((state) => {
      // Deep clone to avoid mutation bugs
      const newPages = [...state.pages];
      const page = newPages[pageIndex];
      if (!page) return state;

      const section = page.sections.find(s => s.id === sectionId);
      if (!section) return state;

      const block = section.blocks.find(b => b.id === blockId);
      if (!block) return state;

      // Only update if content changed
      if (block.content === newContent) return state;

      block.content = newContent;
      
      return { pages: newPages, isDirty: true };
    }),

  reset: () => set({ pages: [], isDirty: false })
}));
