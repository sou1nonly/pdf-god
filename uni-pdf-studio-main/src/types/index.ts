/**
 * Type Definitions Index
 * 
 * Central export point for all TypeScript types used in the PDF editor.
 */

// Text extraction types
export type {
  TextRun,
  TextLine,
  TextBlock,
  PageTextContent,
  TextExtractionResult,
  TextExtractionOptions,
} from './textBlock';

// Overlay types
export type {
  TextOverlay,
  OverlayTransform,
  SelectionState,
  ResizeHandle,
  SnapGuide,
  SnapResult,
  OverlayHistory,
  EditorMode,
  EditorSettings,
} from './overlay';

// Export types
export type {
  ExportMode,
  ExportOptions,
  ExportProgress,
  ExportResult,
  TextSegment,
  StampedText,
  FontInfo,
  FontCache,
  RenderOptions,
  ImageExportOptions,
  PDFMetadata,
} from './pdfExport';

// Editor state types
export type {
  EditorState,
  EditorAction,
  ViewportInfo,
  KeyboardShortcut,
  ContextMenuOption,
  NotificationMessage,
  PerformanceMetrics,
  ErrorInfo,
} from './editor';
