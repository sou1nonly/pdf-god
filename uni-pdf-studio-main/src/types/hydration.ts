export type HydratedDocument = {
  pages: HydratedPage[];
  source: {
    pageCount: number;
    createdAt: number;
  };
};

export type HydratedPage = {
  pageIndex: number; // 0-based
  dims: { width: number; height: number }; // PDF points or viewport units

  // Static layer
  backgroundBlob: Blob | null; // v1 can be null

  // Semantic layer
  blocks: (TextBlock | ImageBlock | TableBlock)[];

  // Raw stats useful for tuning heuristics
  meta: {
    lineHeightEstimate: number | null;
    avgFontSize: number | null;
  };
};

export type BlockType = 'text' | 'image' | 'table';

export type BaseBlock = {
  id: string;
  type: BlockType;
  box: [number, number, number, number]; // [x%, y%, w%, h%]
};

export type TableBlock = BaseBlock & {
  type: 'table';
  rows: TableRow[];
};

export type TableRow = {
  cells: TableCell[];
  height?: number;
};

export type TableCell = {
  content: string; // HTML
  box: [number, number, number, number]; // [x%, y%, w%, h%] relative to page (or table? let's do page for simplicity of erasure)
  styles: Partial<TextBlockStyles>; // Font size, weight, etc.
  colSpan?: number;
  rowSpan?: number;
  width?: number; // % width
  align?: 'left' | 'center' | 'right';
};

export type ImageBlock = BaseBlock & {
  type: 'image';
  blob: Blob;
  mimeType: string;
  rotation: number;
};

export type TextBlock = BaseBlock & {
  type: 'text';
  html: string;              // already-normalized HTML text
  styles: TextBlockStyles;
  meta: TextBlockMeta;
};

export type TextBlockStyles = {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  align: 'left' | 'center' | 'right' | 'justify';
  letterSpacing: number;
  italic: boolean;
  underline: boolean;
  lineHeight: number | null; // in px or relative
};

export type TextBlockMeta = {
  isHeader: boolean;
  isListItem: boolean;
  isCaption: boolean;
  rotation: number; // degrees
  lineHeightRatio: number; // block lineHeight / base lineHeight
  columnIndex: number; // for multi-column layouts
  sourceRuns: number;  // how many text items contributed
};

// Intermediate types for clustering pipeline
export type TextRunRaw = {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontName: string;
  dir: string;
  rotation: number; // computed from transform
  transform: number[]; // raw transform matrix
  color?: string;
};

export type TextLine = {
  runs: TextRunRaw[];
  y: number; // normalized y
  xStart: number;
  xEnd: number;
  height: number;
  columnIndex?: number;
};

export type TextParagraph = {
  lines: TextLine[];
  columnIndex: number;
  boundingBox: { x: number; y: number; w: number; h: number };
};
