/**
 * The types of content our AI model can classify.
 * This maps to the labels output by the local LayoutLM/DistilBERT model.
 */
export type SemanticContentType = 
  | 'heading'       // H1, H2, H3
  | 'paragraph'     // Standard body text
  | 'list_item'     // Bullet or numbered lists
  | 'table_row'     // Detected table rows
  | 'image_caption' // Text likely belonging to an image
  | 'code_block'    // Code snippets
  | 'unknown';

/**
 * A single unit of content.
 * The AI classifies a "line" or "sentence" as one of these blocks.
 */
export interface SemanticBlock {
  id: string;
  type: SemanticContentType;
  content: string; // The raw text
  metadata?: {
    confidence: number; // 0.0 to 1.0 (How sure is the AI?)
    originalIndex?: number; // Use to keep order if needed
    isHandwritten?: boolean; // If using an OCR model that detects this
  };
}

/**
 * A logical grouping of blocks.
 * The "Assembler" will group consecutive blocks into these sections.
 * e.g., 5 'list_item' blocks become 1 'ListSection'.
 */
export type SectionType = 'standard' | 'list_group' | 'table_group' | 'columns_2';

export interface SemanticSection {
  id: string;
  type: SectionType;
  blocks: SemanticBlock[]; // The children blocks
  
  // Layout hints for the renderer
  layout?: {
    columns?: number;
    backgroundColor?: string;
  };
}

/**
 * The final structure of a processed page.
 */
export interface ProcessedPage {
  pageNumber: number;
  sections: SemanticSection[]; // The reconstructed flow
  originalImageBlob?: Blob;    // Background (optional, for reference)
}
