import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { FileText, ZoomIn, ZoomOut, Upload, Eye, Edit } from "lucide-react";
import { Toolbar } from "@/components/layout/Toolbar";
import { LeftSidebar } from "@/components/layout/LeftSidebar";
import { RightSidebar } from "@/components/layout/RightSidebar";
import { cn } from "@/lib/utils";

import { TopBar } from "@/components/layout/TopBar";
import { PDFViewer } from "@/components/document/PDFViewer";
import { HydratedPageView } from "@/components/editor/HydratedPageView";
import { ProcessingOverlay } from "@/components/editor/ProcessingOverlay";
import { CanvaToolbar } from "@/components/editor/CanvaToolbar";
import { ColorPanel } from "@/components/editor/CanvaToolbar";
import { LayersPanel, Layer } from "@/components/editor/MultiLayerCanvas";
import { MobileDrawer } from "@/components/layout/MobileDrawer";
import { useHydrationEngine } from "@/hooks/engine/useHydrationEngine";
import { extractTextFromPages } from "@/lib/ai/text-extraction";
import { saveAnnotations, loadAnnotations } from "@/lib/annotations-service";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { downloadFile } from "@/lib/storage";
import type { DrawingTool } from "@/components/editor/DrawingCanvas";

const EditorPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const documentId = searchParams.get("id");

  // Refs for capturing page canvases for export
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [fileName, setFileName] = useState("Untitled Document");
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [mobileLeftOpen, setMobileLeftOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<DrawingTool>('select');
  const [viewMode, setViewMode] = useState<'preview' | 'edit'>('preview');
  const [zoomMode, setZoomMode] = useState<'fit-width' | 'original' | 'custom'>('fit-width');
  const [isLoading, setIsLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [rotation, setRotation] = useState(0);
  const [availableWidth, setAvailableWidth] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState(0);

  // Drawing state
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [fillColor, setFillColor] = useState('transparent');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [opacity, setOpacity] = useState(1);

  // Annotations state - Map of pageIndex to fabric objects
  const [pageAnnotations, setPageAnnotations] = useState<Map<number, any[]>>(new Map());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Undo/Redo state for canvas - managed per-canvas via window.__drawingCanvas
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Layer state - each layer has its own canvas
  // Special layer: 'pdf-content' is the base PDF text layer (not a canvas)
  const [layers, setLayers] = useState<Layer[]>([
    { id: 'pdf-content', name: 'PDF Content', visible: true, locked: false, order: 0 },
    { id: 'annotations-1', name: 'Annotations', visible: true, locked: false, order: 1 }
  ]);
  const [activeLayerId, setActiveLayerId] = useState<string>('pdf-content');

  // Layer data - stores objects for each layer per page
  const [layerData, setLayerData] = useState<Map<string, Map<number, any[]>>>(new Map());

  // Layer canvas refs - key is `${pageIndex}-${layerId}`
  const layerCanvasRefs = useRef<Map<string, any>>(new Map());

  // Register layer canvas refs
  const handleLayerCanvasReady = useCallback((pageIndex: number, layerId: string, ref: any) => {
    const key = `${pageIndex}-${layerId}`;
    if (ref) {
      layerCanvasRefs.current.set(key, ref);
    } else {
      layerCanvasRefs.current.delete(key);
    }
  }, []);

  // Get the active layer canvas for the current page
  const getActiveLayerCanvas = useCallback(() => {
    const key = `${currentPage - 1}-${activeLayerId}`;
    return layerCanvasRefs.current.get(key);
  }, [currentPage, activeLayerId]);

  const handleLayerAdd = useCallback(() => {
    const newId = `annotations-${Date.now()}`;
    const maxOrder = Math.max(...layers.map(l => l.order), -1);
    const annotationCount = layers.filter(l => l.id !== 'pdf-content').length;
    setLayers(prev => [...prev, {
      id: newId,
      name: `Annotations ${annotationCount + 1}`,
      visible: true,
      locked: false,
      order: maxOrder + 1
    }]);
    setActiveLayerId(newId);
  }, [layers]);

  const handleLayerDelete = useCallback((id: string) => {
    // Cannot delete the PDF Content layer
    if (id === 'pdf-content') return;

    setLayers(prev => {
      // Must keep at least the PDF Content layer
      const annotationLayers = prev.filter(l => l.id !== 'pdf-content');
      if (annotationLayers.length <= 1) return prev; // Keep at least one annotation layer

      const newLayers = prev.filter(l => l.id !== id);
      if (activeLayerId === id) {
        // Switch to PDF Content or another annotation layer
        const remaining = newLayers.filter(l => l.id !== 'pdf-content');
        setActiveLayerId(remaining.length > 0 ? remaining[remaining.length - 1].id : 'pdf-content');
      }
      return newLayers;
    });
    // Also delete layer data
    setLayerData(prev => {
      const newData = new Map(prev);
      newData.delete(id);
      return newData;
    });
  }, [activeLayerId]);

  const handleLayerVisibilityChange = useCallback((id: string, visible: boolean) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, visible } : l));
  }, []);

  const handleLayerLockChange = useCallback((id: string, locked: boolean) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, locked } : l));
  }, []);

  const handleLayerRename = useCallback((id: string, name: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, name } : l));
  }, []);

  // Reorder layers by swapping order values
  const handleLayerReorder = useCallback((layerId: string, direction: 'up' | 'down') => {
    setLayers(prev => {
      const sortedByOrder = [...prev].sort((a, b) => a.order - b.order);
      const currentIdx = sortedByOrder.findIndex(l => l.id === layerId);

      if (currentIdx === -1) return prev;

      const targetIdx = direction === 'up' ? currentIdx + 1 : currentIdx - 1;
      if (targetIdx < 0 || targetIdx >= sortedByOrder.length) return prev;

      // Swap the order values
      const currentOrder = sortedByOrder[currentIdx].order;
      const targetOrder = sortedByOrder[targetIdx].order;

      return prev.map(l => {
        if (l.id === sortedByOrder[currentIdx].id) return { ...l, order: targetOrder };
        if (l.id === sortedByOrder[targetIdx].id) return { ...l, order: currentOrder };
        return l;
      });
    });
  }, []);

  // Store original order values when selecting a layer to restore later
  const originalOrdersRef = useRef<Map<string, number>>(new Map());

  // Handle layer selection - bring to top visually
  const handleLayerSelect = useCallback((layerId: string) => {
    // First, restore previous layer's order if it was boosted
    if (activeLayerId && activeLayerId !== layerId) {
      const originalOrder = originalOrdersRef.current.get(activeLayerId);
      if (originalOrder !== undefined) {
        setLayers(prev => prev.map(l =>
          l.id === activeLayerId ? { ...l, order: originalOrder } : l
        ));
      }
    }

    // Store the new layer's original order before boosting
    setLayers(prev => {
      const layer = prev.find(l => l.id === layerId);
      if (layer) {
        originalOrdersRef.current.set(layerId, layer.order);
        // Boost this layer to top (max order + 100 to ensure it's on top)
        const maxOrder = Math.max(...prev.map(l => l.order));
        return prev.map(l =>
          l.id === layerId ? { ...l, order: maxOrder + 100 } : l
        );
      }
      return prev;
    });

    setActiveLayerId(layerId);
  }, [activeLayerId]);

  const handleLayerObjectsChange = useCallback((layerId: string, pageIndex: number, objects: any[]) => {
    setLayerData(prev => {
      const newData = new Map(prev);
      if (!newData.has(layerId)) {
        newData.set(layerId, new Map());
      }
      newData.get(layerId)!.set(pageIndex, objects);
      return newData;
    });
    setHasUnsavedChanges(true);
  }, []);

  const { processFile, pages, status, progress, stageInfo, updateBlock, moveBlock, updateBlockStyles } = useHydrationEngine();

  // Extract text from pages for AI (memoized) - must be after useHydrationEngine
  const documentText = useMemo(() => {
    if (pages && pages.length > 0) {
      return extractTextFromPages(pages);
    }
    return '';
  }, [pages]);

  const totalPages = numPages || (pages ? pages.length : 1);

  const handleDocumentLoad = (pdf: any) => {
    setPdfDocument(pdf);
    setNumPages(pdf.numPages);
  };

  // Handle drawing changes - track locally, no auto-save
  const handleDrawingChange = useCallback((pageIndex: number, objects: any[]) => {
    // Update local state immediately
    setPageAnnotations(prev => {
      const newMap = new Map(prev);
      newMap.set(pageIndex, objects);
      return newMap;
    });

    // Mark as having unsaved changes
    setHasUnsavedChanges(true);
  }, []);

  // Handle undo/redo state changes from canvas
  const handleHistoryChange = useCallback((canUndoNow: boolean, canRedoNow: boolean) => {
    setCanUndo(canUndoNow);
    setCanRedo(canRedoNow);
  }, []);

  // Undo/Redo handlers that delegate to the active layer canvas
  const handleUndo = useCallback(() => {
    const canvas = getActiveLayerCanvas();
    canvas?.undo?.();
  }, [getActiveLayerCanvas]);

  const handleRedo = useCallback(() => {
    const canvas = getActiveLayerCanvas();
    canvas?.redo?.();
  }, [getActiveLayerCanvas]);

  const handleClearAll = useCallback(() => {
    if (confirm('Clear all drawings on this layer?')) {
      const canvas = getActiveLayerCanvas();
      canvas?.clear?.();
      setHasUnsavedChanges(true);
    }
  }, [getActiveLayerCanvas]);

  // Fetch document on load
  useEffect(() => {
    const loadDocument = async () => {
      // Check for local file from navigation state (Guest Mode)
      const state = location.state as { fileUrl?: string; fileName?: string; isLocal?: boolean } | null;

      if (state?.fileUrl && state?.isLocal) {
        console.log("Loading local file (Guest Mode):", state.fileName);
        try {
          setIsLoading(true);
          setFileName(state.fileName || "Untitled.pdf");
          setPdfUrl(state.fileUrl);

          // Fetch blob from object URL to process
          const response = await fetch(state.fileUrl);
          const blob = await response.blob();

          await processFile(blob);
          toast.success("Guest document loaded");
        } catch (err: any) {
          console.error("Local load error:", err);
          toast.error("Failed to load local file");
        } finally {
          setIsLoading(false);
        }
        return;
      }

      if (!documentId) {
        // If no ID and no local file, redirect to documents list
        navigate('/');
        return;
      }

      setIsLoading(true);
      try {
        // 1. Get metadata
        // Explicitly cast or type the response if automatic inference fails
        const { data: doc, error } = await supabase
          .from('documents')
          .select('*')
          .eq('id', documentId)
          .single<any>(); // Using any to bypass strict typing issues temporarily, or import proper Database type

        if (error) throw error;
        if (doc) {
          setFileName(doc.file_name);

          // 2. Download file blob
          const blob = await downloadFile(doc.storage_path);
          if (blob) {
            // Create URL for preview mode
            const url = URL.createObjectURL(blob);
            setPdfUrl(url);

            // 3. Process for hydration (Edit mode)
            await processFile(blob);

            // 4. Load annotations from cloud
            const { annotations, error: annotationsError } = await loadAnnotations(documentId);
            if (!annotationsError && annotations.size > 0) {
              setPageAnnotations(annotations);
              console.log(`Loaded annotations for ${annotations.size} pages`);
            }

            toast.success("Document loaded successfully");
          } else {
            throw new Error("Failed to download file content");
          }
        }
      } catch (err: any) {
        console.error("Error loading document:", err);
        toast.error("Failed to load document", { description: err.message });
      } finally {
        setIsLoading(false);
      }
    };

    loadDocument();

    // Cleanup
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [documentId]); // Removed processFile from deps to avoid loops if it's not stable

  // Auto-collapse sidebars on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setLeftSidebarOpen(false);
        setRightSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Measure available width for smart scaling
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        // Subtract 48px for padding (p-6 is 24px * 2) roughly, or just use content box
        // The scroll container has p-2 sm:p-4 md:p-6 which varies
        // Let's use the width directly and let HydratedPageView handle?
        // No, we decided to handle padding here.
        // Padding is on the scroll container itself: p-2 sm:p-4 md:p-6
        // AND on the pageContainer: py-8 px-4
        // Logic:
        // Scroll Container (p-6) -> Child (w-full) -> Child has px-4.
        // Total padding = p-6 (24px*2) + px-4 (16px*2) = 48+32 = 80px?
        // Wait, the scroll container HAS padding?
        // Line 688: "bg-muted/30 relative p-2 sm:p-4 md:p-6"
        // So content width is W - padding.
        // Then inside renderEditMode: "w-full py-8 px-4".
        // So width available to page is (W - scrollPadding) - pagePadding.
        // Let's rely on clientWidth/contentRect of scroll view?
        setAvailableWidth(entry.contentRect.width);
      }
    });
    observer.observe(scrollContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // Scroll to page in Edit Mode when currentPage changes (e.g. Nav Bar click)
  useEffect(() => {
    if (viewMode === 'edit') {
      const el = document.getElementById(`page-${currentPage}`);
      if (el) {
        el.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
    }
  }, [currentPage, viewMode]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 10, 500));
    setZoomMode('custom');
  };
  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 10, 10));
    setZoomMode('custom');
  };

  const handleSave = async () => {
    if (!documentId) {
      toast.error("No document to save");
      return;
    }

    if (!hasUnsavedChanges) {
      toast.info("No changes to save");
      return;
    }

    setIsSaving(true);

    try {
      // Collect annotations from all layer canvases per page
      const savePromises: Promise<{ success: boolean; error?: string }>[] = [];
      const pageCount = pages?.length || 0;

      for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
        // Get all annotation layers for this page (excluding pdf-content layer)
        const annotationLayers = layers.filter(l => l.id !== 'pdf-content');
        let combinedObjects: any[] = [];

        for (const layer of annotationLayers) {
          const key = `${pageIndex}-${layer.id}`;
          const layerRef = layerCanvasRefs.current.get(key);
          if (layerRef?.getObjects) {
            const objects = layerRef.getObjects();
            if (objects && objects.length > 0) {
              combinedObjects = [...combinedObjects, ...objects];
            }
          }
        }

        // Only save if there are objects on this page
        if (combinedObjects.length > 0) {
          savePromises.push(saveAnnotations(documentId, pageIndex, combinedObjects));
        }
      }

      if (savePromises.length === 0) {
        toast.info("No annotations to save");
        setIsSaving(false);
        return;
      }

      const results = await Promise.all(savePromises);

      // Check if any failed
      const failed = results.filter(r => !r.success);

      if (failed.length > 0) {
        console.warn('Some annotations failed to save:', failed);
        toast.warning(`Saved ${results.length - failed.length}/${results.length} pages`, {
          description: 'Some annotations could not be synced to cloud'
        });
      } else {
        toast.success("Document saved successfully!", {
          description: `${savePromises.length} pages synced to cloud`
        });
      }

      setHasUnsavedChanges(false);
    } catch (err: any) {
      console.error('Error saving document:', err);
      toast.error("Failed to save document", { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async () => {
    console.log('[Download] Starting download...', { viewMode, pagesLength: pages?.length, fileName });

    if (viewMode === 'edit' && pages && pages.length > 0) {
      console.log('[Download] Using export path (text + annotations)');

      // Collect annotation canvases for each page
      const annotationCanvases: (HTMLCanvasElement | null)[] = [];

      for (let i = 0; i < pages.length; i++) {
        // Get all layer canvases for this page and merge them
        const layerKeys = Array.from(layerCanvasRefs.current.keys())
          .filter(key => key.startsWith(`${i}-`));

        console.log(`[Download] Page ${i}: found ${layerKeys.length} layers`);

        if (layerKeys.length > 0) {
          // Get the first annotation layer's canvas (we can merge multiple later if needed)
          const firstLayerRef = layerCanvasRefs.current.get(layerKeys[0]);
          const canvas = firstLayerRef?.getCanvas?.() as HTMLCanvasElement | null;
          console.log(`[Download] Page ${i}: canvas =`, canvas ? `${canvas.width}x${canvas.height}` : 'null');
          annotationCanvases.push(canvas);
        } else {
          annotationCanvases.push(null);
        }
      }

      // Import the new export function
      const { exportHydratedWithAnnotations } = await import('@/lib/export-utils');

      console.log('[Download] Calling exportHydratedWithAnnotations with fileName:', fileName);

      toast.promise(
        exportHydratedWithAnnotations(pages, annotationCanvases, fileName),
        {
          loading: 'Generating PDF with selectable text...',
          success: 'PDF downloaded successfully!',
          error: (err) => {
            console.error('[Download] Export error:', err);
            return 'Failed to generate PDF';
          }
        }
      );
    } else {
      console.log('[Download] Using fallback path (original blob)', { pdfUrl: !!pdfUrl });
      // Fallback for preview mode (just download original)
      if (pdfUrl) {
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = fileName;
        console.log('[Download] Fallback download with fileName:', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      // Save: Ctrl+S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
        return;
      }

      // Undo: Ctrl+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
        return;
      }

      // Redo: Ctrl+Y
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Zoom In: Ctrl + or Ctrl =
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        handleZoomIn();
        return;
      }

      // Zoom Out: Ctrl -
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        handleZoomOut();
        return;
      }

      // Delete/Backspace: Delete selected annotation
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const canvas = getActiveLayerCanvas();
        if (canvas && canvas.deleteSelected) {
          canvas.deleteSelected();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleUndo, handleRedo, handleZoomIn, handleZoomOut, getActiveLayerCanvas]);

  // Determine what to show in Edit mode
  const renderEditMode = () => {
    // Show processing overlay while hydrating
    if (status === 'processing' || status === 'idle') {
      return <ProcessingOverlay stageInfo={stageInfo} progress={progress} />;
    }

    // Show error state
    if (status === 'error') {
      return (
        <div className="flex flex-col items-center justify-center h-full text-red-500">
          <FileText className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">Failed to process document</p>
          <p className="text-sm text-gray-500 mt-2">Please try again or switch to Preview mode</p>
        </div>
      );
    }

    // Show the editable pages
    if (status === 'complete' && pages && pages.length > 0) {
      return (
        <div ref={pageContainerRef} className="flex flex-col items-center gap-4 w-full py-4 px-4 min-w-0">
          {pages.map(page => (
            <div key={page.pageIndex} data-page-canvas data-page-index={page.pageIndex}>
              <HydratedPageView
                page={page}
                scale={zoom / 100}
                fitToContainer={zoomMode === 'fit-width'}
                containerWidth={Math.max(0, availableWidth - 32)} // Subtract px-4 (32px) from page container. contentRect already handles scroll container padding.
                drawingTool={activeTool}
                strokeColor={strokeColor}
                strokeWidth={strokeWidth}
                fillColor={fillColor}
                opacity={opacity}
                layers={layers}
                activeLayerId={activeLayerId}
                onUpdateBlock={(blockId, html) => updateBlock(page.pageIndex, blockId, html)}
                onMoveBlock={(blockId, newBox) => moveBlock(page.pageIndex, blockId, newBox)}
                onUpdateBlockStyles={(blockId, styles) => updateBlockStyles(page.pageIndex, blockId, styles)}
                onLayerObjectsChange={(layerId, objects) => handleLayerObjectsChange(layerId, page.pageIndex, objects)}
                onHistoryChange={handleHistoryChange}
                onLayerCanvasReady={(layerId, ref) => handleLayerCanvasReady(page.pageIndex, layerId, ref)}
                onZoomChange={setZoom}
              />
            </div>
          ))}

          {/* End of document marker */}
          <div className="text-center text-gray-400 text-sm pb-8">
            <p>— End of Document —</p>
            <p className="text-xs mt-1">{pages.length} pages • {pages.reduce((acc, p) => acc + p.blocks.length, 0)} blocks</p>
          </div>
        </div>
      );
    }

    // Fallback
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <FileText className="w-12 h-12 mb-4 opacity-50" />
        <p>No content to display</p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-background">
      {/* Full-width TopBar */}
      <TopBar
        fileName={fileName}
        onFileNameChange={setFileName}
        onSave={handleSave}
        onDownload={handleDownload}
        onBack={() => navigate('/')}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        processingStatus={status}
        processingProgress={progress}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        onMobileLeftToggle={() => setMobileLeftOpen(true)}
        onMobileRightToggle={() => setMobileRightOpen(true)}
      />

      {/* Body: Sidebars + Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar - Desktop */}
        {viewMode === 'preview' && (
          <div
            className={cn(
              "hidden md:block h-full shadow-soft z-20 transition-all duration-300 ease-in-out border-r overflow-hidden bg-background",
              leftSidebarOpen ? "w-52" : "w-12"
            )}
          >
            <LeftSidebar
              isOpen={leftSidebarOpen}
              onToggle={() => setLeftSidebarOpen(!leftSidebarOpen)}
              pdfDocument={pdfDocument}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}

        {/* Center Content */}
        <div className="flex-1 flex flex-col min-w-0 relative h-full">
          <main className="flex-1 flex flex-col relative overflow-hidden bg-background">
            <Toolbar
              zoom={zoom}
              onZoomChange={(z) => {
                setZoom(z);
                setZoomMode('custom');
              }}
              zoomMode={zoomMode}
              onZoomModeChange={(mode) => {
                setZoomMode(mode);
                if (mode === 'original') setZoom(100);
              }}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              onRotate={() => setRotation(r => (r + 90) % 360)}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={handleUndo}
              onRedo={handleRedo}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              activeTool={activeTool}
              onToolChange={setActiveTool}
              onClearAll={handleClearAll}
            />
            <div
              ref={scrollContainerRef}
              className={cn(
                "flex-1 flex items-start bg-muted/30 relative p-2 sm:p-4 md:p-6",
                zoomMode === 'fit-width' ? "overflow-y-auto overflow-x-hidden" : "overflow-auto"
              )}
            >
              <div className="m-auto min-w-fit w-full flex flex-col items-center">
                {viewMode === 'preview' ? (
                  <PDFViewer
                    url={pdfUrl}
                    scale={zoom}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                    totalPages={totalPages}
                    onDocumentLoad={handleDocumentLoad}
                    rotation={rotation}
                    fitToWidth={zoomMode === 'fit-width'}
                    containerWidth={Math.max(0, availableWidth - 52)}
                    onZoomChange={setZoom}
                  />
                ) : (
                  <>


                    {/* Main edit area */}
                    {renderEditMode()}




                  </>
                )}
              </div>
            </div>
          </main>
        </div>

        {/* Right Sidebar - Desktop */}
        <div
          className={cn(
            "hidden lg:block h-full shadow-soft z-20 transition-all duration-300 ease-in-out border-l overflow-hidden bg-background",
            rightSidebarOpen ? "w-80" : "w-14"
          )}
        >
          <RightSidebar
            isOpen={rightSidebarOpen}
            onToggle={() => setRightSidebarOpen(!rightSidebarOpen)}
            documentText={documentText}
          />
        </div>
      </div>

      {/* Floating UI Elements - Fixed positioning outside scroll container */}
      {status === 'complete' && viewMode === 'edit' && (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
          <div className="pointer-events-auto">
            <CanvaToolbar
              activeTool={activeTool}
              onToolChange={setActiveTool}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onClearAll={handleClearAll}
              onExport={handleDownload}
            />
          </div>

          {(activeTool === 'rect' || activeTool === 'circle' || activeTool === 'draw' || activeTool === 'arrow' || activeTool === 'line') && (
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4 pointer-events-auto">
              <ColorPanel
                strokeColor={strokeColor}
                onStrokeColorChange={setStrokeColor}
                fillColor={fillColor}
                onFillColorChange={setFillColor}
                strokeWidth={strokeWidth}
                onStrokeWidthChange={setStrokeWidth}
                opacity={opacity}
                onOpacityChange={setOpacity}
              />
            </div>
          )}

          <div
            className="fixed transition-all duration-300 ease-in-out hidden lg:block pointer-events-auto"
            style={{ top: '8rem', right: rightSidebarOpen ? '22rem' : '6rem' }}
          >
            <LayersPanel
              layers={layers}
              activeLayerId={activeLayerId}
              onSelectLayer={handleLayerSelect}
              onAddLayer={handleLayerAdd}
              onDeleteLayer={handleLayerDelete}
              onToggleVisibility={(id) => handleLayerVisibilityChange(id, !layers.find(l => l.id === id)?.visible)}
              onToggleLock={(id) => handleLayerLockChange(id, !layers.find(l => l.id === id)?.locked)}
              onRenameLayer={handleLayerRename}
              onReorderLayer={handleLayerReorder}
            />
          </div>
        </div>
      )}

      {/* Mobile Drawers */}
      <MobileDrawer isOpen={mobileLeftOpen} onOpenChange={setMobileLeftOpen} side="left">
        <LeftSidebar
          isOpen={true}
          onToggle={() => setMobileLeftOpen(false)}
          pdfDocument={pdfDocument}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      </MobileDrawer>

      <MobileDrawer isOpen={mobileRightOpen} onOpenChange={setMobileRightOpen} side="right">
        <RightSidebar
          isOpen={true}
          onToggle={() => setMobileRightOpen(false)}
          documentText={documentText}
        />
      </MobileDrawer>
    </div>
  );
};

export default EditorPage;

