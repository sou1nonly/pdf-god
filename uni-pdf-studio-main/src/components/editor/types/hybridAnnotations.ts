/**
 * Unified Annotation System for Triple Layer Hybrid Architecture
 * 
 * This type system coordinates annotations across three layers:
 * 1. Excalidraw (sketch mode) - Freehand drawings
 * 2. Fabric.js (design mode) - Precise shapes and images
 * 3. TipTap (annotate mode) - Rich text comments
 */

// Note: Excalidraw types are complex, using any for now to avoid type issues
type ExcalidrawElement = any;
type ExcalidrawAppState = any;

// Base annotation interface
export interface BaseAnnotation {
  id: string;
  pageNumber: number;
  createdAt: number;
  updatedAt: number;
  layer: 'sketch' | 'design' | 'text';
}

// Sketch layer annotation (Excalidraw)
export interface SketchAnnotation extends BaseAnnotation {
  layer: 'sketch';
  excalidrawData: {
    elements: ExcalidrawElement[];
    appState: any;
  };
}

// Design layer annotation (Fabric.js)
export interface DesignAnnotation extends BaseAnnotation {
  layer: 'design';
  fabricData: {
    type: 'rect' | 'circle' | 'line' | 'arrow' | 'path' | 'image' | 'group';
    fabricJSON: any; // Fabric.js object.toJSON()
  };
}

// Text layer annotation (TipTap)
export interface TextAnnotation extends BaseAnnotation {
  layer: 'text';
  textData: {
    content: string; // HTML or JSON from TipTap
    position: {
      x: number;
      y: number;
    };
    width: number;
    height?: number;
    backgroundColor?: string;
  };
}

// Union type for all annotations
export type HybridAnnotation = SketchAnnotation | DesignAnnotation | TextAnnotation;

// Annotation collection per page
export interface PageAnnotations {
  pageNumber: number;
  annotations: HybridAnnotation[];
}

// Document-level annotation data
export interface DocumentAnnotations {
  documentId: string;
  pages: Map<number, HybridAnnotation[]>;
  metadata: {
    totalAnnotations: number;
    lastModified: number;
    version: string;
  };
}

// Serializable format for saving/loading
export interface SerializableDocumentAnnotations {
  documentId: string;
  pages: Array<{
    pageNumber: number;
    annotations: HybridAnnotation[];
  }>;
  metadata: {
    totalAnnotations: number;
    lastModified: number;
    version: string;
  };
}

// Helper functions
export function createSketchAnnotation(
  pageNumber: number,
  elements: ExcalidrawElement[],
  appState: any
): SketchAnnotation {
  return {
    id: `sketch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    pageNumber,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    layer: 'sketch',
    excalidrawData: {
      elements,
      appState,
    },
  };
}

export function createDesignAnnotation(
  pageNumber: number,
  fabricJSON: any,
  type: DesignAnnotation['fabricData']['type']
): DesignAnnotation {
  return {
    id: `design-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    pageNumber,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    layer: 'design',
    fabricData: {
      type,
      fabricJSON,
    },
  };
}

export function createTextAnnotation(
  pageNumber: number,
  content: string,
  position: { x: number; y: number },
  width: number
): TextAnnotation {
  return {
    id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    pageNumber,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    layer: 'text',
    textData: {
      content,
      position,
      width,
      backgroundColor: '#fef3c7', // Default yellow
    },
  };
}

// Type guards
export function isSketchAnnotation(annotation: HybridAnnotation): annotation is SketchAnnotation {
  return annotation.layer === 'sketch';
}

export function isDesignAnnotation(annotation: HybridAnnotation): annotation is DesignAnnotation {
  return annotation.layer === 'design';
}

export function isTextAnnotation(annotation: HybridAnnotation): annotation is TextAnnotation {
  return annotation.layer === 'text';
}

// Serialization helpers
export function serializeAnnotations(doc: DocumentAnnotations): SerializableDocumentAnnotations {
  const pages: Array<{ pageNumber: number; annotations: HybridAnnotation[] }> = [];
  
  doc.pages.forEach((annotations, pageNumber) => {
    pages.push({ pageNumber, annotations });
  });

  return {
    documentId: doc.documentId,
    pages,
    metadata: doc.metadata,
  };
}

export function deserializeAnnotations(data: SerializableDocumentAnnotations): DocumentAnnotations {
  const pages = new Map<number, HybridAnnotation[]>();
  
  data.pages.forEach(({ pageNumber, annotations }) => {
    pages.set(pageNumber, annotations);
  });

  return {
    documentId: data.documentId,
    pages,
    metadata: data.metadata,
  };
}
