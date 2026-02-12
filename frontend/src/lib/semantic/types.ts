/**
 * Semantic Document Types
 * 
 * These types represent a document as a semantic structure (headings, paragraphs, lists)
 * rather than just coordinates. This enables:
 * - AI-powered editing via text prompts
 * - Automatic layout without overlaps
 * - Structured document manipulation
 */

import type { TextBlockStyles } from '@/types/hydration';

// ============================================================================
// Core Document Structure
// ============================================================================

/**
 * The complete semantic representation of a document.
 * The Typst source is the single source of truth.
 */
export interface SemanticDocument {
  /** Typst source code - THE source of truth for rendering and export */
  typstSource: string;
  
  /** Parsed structure for AI tools and programmatic access */
  structure: DocumentStructure;
  
  /** Original page dimensions for coordinate calculations */
  pageInfo: PageInfo[];
  
  /** Document metadata */
  metadata: DocumentMetadata;
}

export interface DocumentStructure {
  /** Root-level sections of the document */
  sections: SemanticSection[];
  
  /** Flattened index for quick lookup by ID */
  sectionIndex: Map<string, SemanticSection>;
}

export interface PageInfo {
  pageIndex: number;
  width: number;
  height: number;
}

export interface DocumentMetadata {
  title?: string;
  author?: string;
  createdAt: number;
  pageCount: number;
  
  /** Typography settings detected from document */
  typography: {
    bodyFontSize: number;
    headingScale: number;  // e.g., 1.5 = headings are 1.5x body size
    lineHeight: number;
  };
}

// ============================================================================
// Section Types
// ============================================================================

export type SectionType = 
  | 'heading'
  | 'paragraph'
  | 'list'
  | 'list-item'
  | 'table'
  | 'image'
  | 'equation'
  | 'page-break';

/**
 * A semantic section of the document.
 * Each section maps to a logical unit (heading, paragraph, etc.)
 */
export interface SemanticSection {
  /** Unique identifier for this section (stable across edits) */
  id: string;
  
  /** Type of content */
  type: SectionType;
  
  /** Heading level (1-6), only for type='heading' */
  level?: number;
  
  /** The content as plain text (for display and search) */
  content: string;
  
  /** The content as Typst markup (for rendering) */
  typstContent: string;
  
  /** Styling information */
  styles: Partial<SectionStyles>;
  
  /** Page this section belongs to (0-indexed) */
  pageIndex: number;
  
  /** Child sections (for nested structures like lists) */
  children?: SemanticSection[];
  
  /** Original coordinates from PDF (for fallback positioning) */
  originalBox?: [number, number, number, number];
  
  /** Metadata about how this section was detected */
  meta: SectionMeta;
}

export interface SectionStyles {
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  color: string;
  align: 'left' | 'center' | 'right' | 'justify';
  italic: boolean;
  underline: boolean;
}

export interface SectionMeta {
  /** How confident we are this detection is correct (0-1) */
  confidence: number;
  
  /** Source of detection: 'heuristic' | 'ml' | 'manual' */
  source: 'heuristic' | 'ml' | 'manual';
  
  /** Column index in multi-column layouts */
  columnIndex: number;
  
  /** Number of original text runs that formed this section */
  sourceRunCount: number;
}

// ============================================================================
// AI Tool Types
// ============================================================================

/**
 * Style changes that can be applied via AI tools
 */
export interface StyleChange {
  fontSize?: number;
  color?: string;
  fontWeight?: number;
  align?: 'left' | 'center' | 'right' | 'justify';
  italic?: boolean;
  underline?: boolean;
}

/**
 * Position specification for moving sections
 */
export type TargetPosition = 
  | { type: 'after'; sectionId: string }
  | { type: 'before'; sectionId: string }
  | { type: 'start' }
  | { type: 'end' };

// ============================================================================
// Extractor Configuration
// ============================================================================

export interface ExtractorConfig {
  /** Whether to use absolute positioning (coordinate-based) or flow layout */
  useAbsolutePositioning: boolean;
  
  /** Minimum confidence to include a section */
  minConfidence: number;
  
  /** Whether to preserve original coordinates as fallback */
  preserveOriginalCoordinates: boolean;
  
  /** Typography detection settings */
  typography: {
    /** Ratio of font size to body to consider as heading */
    headingThreshold: number;
    /** Minimum font size ratio for captions */
    captionThreshold: number;
  };
}

export const DEFAULT_EXTRACTOR_CONFIG: ExtractorConfig = {
  useAbsolutePositioning: false,  // Prefer semantic flow
  minConfidence: 0.5,
  preserveOriginalCoordinates: true,
  typography: {
    headingThreshold: 1.2,
    captionThreshold: 0.85,
  },
};

// ============================================================================
// Generation Result
// ============================================================================

export interface TypstGenerationResult {
  /** The generated Typst source */
  source: string;
  
  /** Any warnings during generation */
  warnings: string[];
  
  /** Statistics about the generation */
  stats: {
    sectionCount: number;
    pageCount: number;
    usedAbsolutePositioning: boolean;
  };
}
