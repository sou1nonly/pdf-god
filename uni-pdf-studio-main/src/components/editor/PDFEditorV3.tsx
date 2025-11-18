import React, { useState, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { useEditorMode } from '@/contexts/EditorModeContext';
import { ExcalidrawLayer } from './layers/ExcalidrawLayer';
import { FabricLayer } from './layers/FabricLayer';
import { TipTapAnnotations } from './layers/TipTapAnnotations';
import { ModeSwitcher } from './ModeSwitcher';
import { useAnnotationManager } from './hooks/useAnnotationManager';
import { EditorTool } from './EditorToolbar';
import { Loader2 } from 'lucide-react';
import type { TextAnnotation } from './types/hybridAnnotations';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFEditorV3Props {
  url: string;
  currentPage: number;
  zoom: number;
  rotation: number;
  activeTool: EditorTool;
  fontSize?: number;
  fontFamily?: string;
  textColor?: string;
  isBold?: boolean;
  isItalic?: boolean;
  strokeWidth?: number;
  strokeColor?: string;
  highlightColor?: string;
  highlightMode?: 'rectangle' | 'pen';
  stampText?: string;
  stampColor?: string;
  fillColor?: string;
  fillOpacity?: number;
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
  onObjectSelected?: (type: string, properties: any) => void;
  onPageCountChange?: (count: number) => void;
  onZoomChange?: (zoom: number) => void;
}

export function PDFEditorV3({
  url,
  currentPage,
  zoom,
  rotation,
  activeTool,
  fontSize = 16,
  fontFamily = 'Arial',
  textColor = '#000000',
  isBold = false,
  isItalic = false,
  strokeWidth = 2,
  strokeColor = '#000000',
  highlightColor = '#FFFF00',
  highlightMode = 'rectangle',
  stampText = 'APPROVED',
  stampColor = '#FF0000',
  fillColor = '#87CEEB',
  fillOpacity = 50,
  onHistoryChange,
  onObjectSelected,
  onPageCountChange,
  onZoomChange,
}: PDFEditorV3Props) {
  const { mode } = useEditorMode();
  const annotationManager = useAnnotationManager();

  const [numPages, setNumPages] = useState<number>(0);
  const [pageWidth, setPageWidth] = useState<number>(800);
  const [pageHeight, setPageHeight] = useState<number>(1000);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Get annotations for current page
  const pageAnnotations = annotationManager.getPageAnnotations(currentPage);

  // Handle document load success
  const handleDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
    onPageCountChange?.(numPages);
    console.log('[PDFEditorV3] Document loaded:', { numPages });
  }, [onPageCountChange]);

  // Handle document load error
  const handleDocumentLoadError = useCallback((error: Error) => {
    console.error('[PDFEditorV3] Document load error:', error);
    setError(error.message);
    setIsLoading(false);
  }, []);

  // Handle page render success
  const handlePageRenderSuccess = useCallback(() => {
    console.log('[PDFEditorV3] Page rendered:', currentPage);
  }, [currentPage]);

  // Update history state
  useEffect(() => {
    onHistoryChange?.(annotationManager.canUndo, annotationManager.canRedo);
  }, [annotationManager.canUndo, annotationManager.canRedo, onHistoryChange]);

  // Excalidraw change handler
  const handleExcalidrawChange = useCallback((elements: any[], appState: any) => {
    // Update sketch annotations for current page
    const sketchAnnotation = {
      id: `sketch-${currentPage}-${Date.now()}`,
      pageNumber: currentPage,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      layer: 'sketch' as const,
      excalidrawData: {
        elements,
        appState,
      },
    };
    
    // For now, we'll store the entire state
    // In production, you'd want more granular updates
    console.log('[PDFEditorV3] Excalidraw changed:', { elements: elements.length });
  }, [currentPage]);

  // Fabric.js object handlers
  const handleFabricObjectAdded = useCallback((object: any) => {
    console.log('[PDFEditorV3] Fabric object added:', object.type);
    // Handle fabric object additions
  }, []);

  const handleFabricObjectModified = useCallback((object: any) => {
    console.log('[PDFEditorV3] Fabric object modified:', object.type);
    // Handle fabric object modifications
  }, []);

  const handleFabricObjectRemoved = useCallback((object: any) => {
    console.log('[PDFEditorV3] Fabric object removed:', object.type);
    // Handle fabric object removals
  }, []);

  const handleFabricSelectionChanged = useCallback((objects: any[]) => {
    console.log('[PDFEditorV3] Fabric selection changed:', objects.length);
    if (objects.length > 0 && onObjectSelected) {
      const obj = objects[0];
      onObjectSelected(obj.type, {
        fill: obj.fill,
        stroke: obj.stroke,
        strokeWidth: obj.strokeWidth,
        opacity: obj.opacity,
      });
    }
  }, [onObjectSelected]);

  // TipTap text annotation handlers
  const handleTextAnnotationUpdate = useCallback((id: string, content: string) => {
    const annotation = pageAnnotations.text.find(a => a.id === id);
    if (annotation) {
      annotationManager.updateTextAnnotation({
        ...annotation,
        textData: {
          ...annotation.textData,
          content,
        },
      });
    }
  }, [pageAnnotations.text, annotationManager]);

  const handleTextAnnotationDelete = useCallback((id: string) => {
    annotationManager.deleteTextAnnotation(currentPage, id);
  }, [currentPage, annotationManager]);

  const handleTextAnnotationMove = useCallback((id: string, x: number, y: number) => {
    annotationManager.moveTextAnnotation(id, currentPage, x, y);
  }, [currentPage, annotationManager]);

  const handleTextAnnotationResize = useCallback((id: string, width: number) => {
    annotationManager.resizeTextAnnotation(id, currentPage, width);
  }, [currentPage, annotationManager]);

  const handleTextAnnotationAdd = useCallback((x: number, y: number) => {
    const newAnnotation: TextAnnotation = {
      id: `text-${Date.now()}`,
      pageNumber: currentPage,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      layer: 'text',
      textData: {
        content: '<p>New text annotation...</p>',
        position: { x, y },
        width: 300,
        backgroundColor: '#fef3c7',
      },
    };
    annotationManager.addTextAnnotation(currentPage, newAnnotation);
  }, [currentPage, annotationManager]);

  // Calculate scaled dimensions
  const scaledWidth = pageWidth * (zoom / 100);
  const scaledHeight = pageHeight * (zoom / 100);

  // Handle mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -10 : 10;
      const newZoom = Math.min(Math.max(zoom + delta, 25), 300);
      onZoomChange?.(newZoom);
    }
  }, [zoom, onZoomChange]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8 max-w-md">
          <h3 className="text-lg font-semibold text-destructive mb-2">Error Loading PDF</h3>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="relative w-full h-full flex flex-col items-center justify-center bg-muted/30 overflow-auto"
      onWheel={handleWheel}
    >
      {/* Mode Switcher - Fixed position */}
      <div className="fixed top-20 right-6 z-50">
        <ModeSwitcher />
      </div>

      {/* PDF Document Container */}
      <div 
        className="relative bg-white shadow-2xl"
        style={{
          width: `${scaledWidth}px`,
          height: `${scaledHeight}px`,
          transform: `rotate(${rotation}deg)`,
          transformOrigin: 'center',
        }}
      >
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-50">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading PDF...</p>
            </div>
          </div>
        )}

        {/* PDF Background Layer */}
        <div className="absolute inset-0">
          <Document
            file={url}
            onLoadSuccess={handleDocumentLoadSuccess}
            onLoadError={handleDocumentLoadError}
            loading={null}
          >
            <Page
              pageNumber={currentPage}
              width={pageWidth}
              scale={zoom / 100}
              rotate={rotation}
              onRenderSuccess={handlePageRenderSuccess}
              onLoadSuccess={(page) => {
                setPageWidth(page.width);
                setPageHeight(page.height);
              }}
              loading={null}
            />
          </Document>
        </div>

        {/* Layer 1: Excalidraw (Sketch Mode) - Only visible and interactive in sketch mode */}
        {mode === 'sketch' && (
          <div className="absolute inset-0" style={{ zIndex: 10 }}>
            <ExcalidrawLayer
              width={scaledWidth}
              height={scaledHeight}
              visible={true}
              onChange={handleExcalidrawChange}
              className="pointer-events-auto"
            />
          </div>
        )}

        {/* Layer 2: Fabric.js (Design Mode) - Only visible and interactive in design mode */}
        {mode === 'design' && (
          <div className="absolute inset-0" style={{ zIndex: 20 }}>
            <FabricLayer
              width={scaledWidth}
              height={scaledHeight}
              activeTool={{
                type: activeTool === 'rectangle' ? 'rect' :
                      activeTool === 'circle' ? 'circle' :
                      activeTool === 'line' ? 'line' :
                      activeTool === 'arrow' ? 'arrow' :
                      activeTool === 'text' ? 'text' :
                      activeTool === 'draw' ? 'path' :
                      'select',
                config: {
                  fill: fillColor,
                  stroke: strokeColor,
                  strokeWidth,
                  opacity: fillOpacity / 100,
                }
              }}
              visible={true}
              onObjectAdded={handleFabricObjectAdded}
              onObjectModified={handleFabricObjectModified}
              onObjectRemoved={handleFabricObjectRemoved}
              onSelectionChanged={handleFabricSelectionChanged}
              className="pointer-events-auto"
            />
          </div>
        )}

        {/* Layer 3: TipTap (Annotate Mode) - Only visible and interactive in annotate mode */}
        {mode === 'annotate' && (
          <div className="absolute inset-0" style={{ zIndex: 30 }}>
            <TipTapAnnotations
              annotations={pageAnnotations.text}
              onUpdate={handleTextAnnotationUpdate}
              onDelete={handleTextAnnotationDelete}
              onMove={handleTextAnnotationMove}
              onResize={handleTextAnnotationResize}
              onAdd={handleTextAnnotationAdd}
              visible={true}
              className="pointer-events-auto"
            />
          </div>
        )}
      </div>

      {/* Page Info */}
      <div className="mt-4 text-sm text-muted-foreground">
        Page {currentPage} of {numPages} • {mode.toUpperCase()} Mode • {zoom}% zoom
      </div>

      {/* Debug Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 bg-background/90 border rounded-lg p-3 text-xs space-y-1 max-w-sm z-50">
          <p className="font-semibold">Debug Info:</p>
          <p>Mode: {mode}</p>
          <p>Page: {currentPage}/{numPages}</p>
          <p>Zoom: {zoom}%</p>
          <p>Design Annotations: {pageAnnotations.design.length}</p>
          <p>Sketch Annotations: {pageAnnotations.sketch.length}</p>
          <p>Text Annotations: {pageAnnotations.text.length}</p>
          <p>Total Annotations: {annotationManager.getTotalCount()}</p>
          <p>Can Undo: {annotationManager.canUndo ? 'Yes' : 'No'}</p>
          <p>Can Redo: {annotationManager.canRedo ? 'Yes' : 'No'}</p>
        </div>
      )}
    </div>
  );
}

export default PDFEditorV3;
