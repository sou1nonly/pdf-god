import { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { FileText, ZoomIn, ZoomOut, Upload, Eye, Edit, Sparkles } from "lucide-react";
import { Toolbar } from "@/components/layout/Toolbar";
import { LeftSidebar } from "@/components/layout/LeftSidebar";
import { RightSidebar } from "@/components/layout/RightSidebar";
import { TopBar } from "@/components/layout/TopBar";
import { PDFViewer } from "@/components/document/PDFViewer";
import { HydratedPageView } from "@/components/editor/HydratedPageView";
import { ProcessingOverlay } from "@/components/editor/ProcessingOverlay";
import { CanvaToolbar } from "@/components/editor/CanvaToolbar";
import { ColorPanel } from "@/components/editor/CanvaToolbar";
import { AIAssistantPanel } from "@/components/ai/AIAssistantPanel";
import { useHydrationEngine } from "@/hooks/engine/useHydrationEngine";
import { useHistory } from "@/lib/editor/historyManager";
import { extractTextFromPages } from "@/lib/ai/text-extraction";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { downloadFile } from "@/lib/storage";
import { exportToPdfHighQuality } from "@/lib/export-utils";
import type { DrawingTool } from "@/components/editor/DrawingCanvas";

const EditorPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const documentId = searchParams.get("id");
  
  // Refs for capturing page canvases for export
  const pageContainerRef = useRef<HTMLDivElement>(null);
  
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [fileName, setFileName] = useState("Untitled Document");
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [activeTool, setActiveTool] = useState<DrawingTool>('select');
  const [viewMode, setViewMode] = useState<'preview' | 'edit'>('preview');
  const [isLoading, setIsLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [rotation, setRotation] = useState(0);
  const [numPages, setNumPages] = useState(0);
  
  // Drawing state
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [fillColor, setFillColor] = useState('transparent');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [opacity, setOpacity] = useState(1);
  
  // AI Assistant state
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  
  // History
  const { canUndo, canRedo, undo, redo } = useHistory();

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

  // Fetch document on load
  useEffect(() => {
    const loadDocument = async () => {
      if (!documentId) {
        // If no ID, redirect to documents list
        navigate('/documents');
        return;
      }
      
      setIsLoading(true);
      try {
        // 1. Get metadata
        const { data: doc, error } = await supabase
          .from('documents')
          .select('*')
          .eq('id', documentId)
          .single();
          
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

  // Auto-collapse sidebars on mobile/tablet
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setLeftSidebarOpen(false);
        setRightSidebarOpen(false);
      } else {
        setLeftSidebarOpen(true);
        setRightSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 10, 500));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 10, 10));

  const handleSave = () => {
    toast.success("Document saved successfully!");
  };

  const handleDownload = async () => {
    if (viewMode === 'edit' && pages && pages.length > 0 && pageContainerRef.current) {
      // Get all page elements for high-quality snapshot export
      const pageElements = Array.from(
        pageContainerRef.current.querySelectorAll('[data-page-canvas]')
      ) as HTMLElement[];
      
      if (pageElements.length === 0) {
        toast.error('No pages found to export');
        return;
      }
      
      // Get original dimensions for each page
      const originalDimensions = pages.map(page => ({
        width: page.dims.width,
        height: page.dims.height
      }));
      
      toast.promise(
        exportToPdfHighQuality(pageElements, fileName, originalDimensions),
        {
          loading: 'Generating high-quality PDF (this may take a moment)...',
          success: 'PDF downloaded successfully!',
          error: 'Failed to generate PDF'
        }
      );
    } else {
      // Fallback for preview mode (just download original)
      if (pdfUrl) {
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

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
        <div ref={pageContainerRef} className="flex flex-col items-center gap-12 w-full py-8 px-4">
          {pages.map(page => (
            <div key={page.pageIndex} data-page-canvas data-page-index={page.pageIndex}>
              <HydratedPageView 
                page={page} 
                scale={zoom / 100}
                drawingTool={activeTool}
                strokeColor={strokeColor}
                strokeWidth={strokeWidth}
                fillColor={fillColor}
                opacity={opacity}
                onUpdateBlock={(blockId, html) => updateBlock(page.pageIndex, blockId, html)}
                onMoveBlock={(blockId, newBox) => moveBlock(page.pageIndex, blockId, newBox)}
                onUpdateBlockStyles={(blockId, styles) => updateBlockStyles(page.pageIndex, blockId, styles)}
                onDrawingChange={(objects) => console.log('Drawing changed:', objects)}
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
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background">
      <TopBar 
        fileName={fileName} 
        onFileNameChange={setFileName}
        onSave={handleSave}
        onDownload={handleDownload}
        onBack={() => navigate('/documents')}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        processingStatus={status}
        processingProgress={progress}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar - Only show in preview mode */}
        {viewMode === 'preview' && (
          <LeftSidebar 
            isOpen={leftSidebarOpen} 
            onToggle={() => setLeftSidebarOpen(!leftSidebarOpen)} 
            pdfDocument={pdfDocument}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        )}
        
        <main className="flex-1 flex flex-col relative overflow-hidden bg-gray-100/50">
          <Toolbar 
            zoom={zoom}
            onZoomChange={setZoom}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onRotate={() => setRotation(r => (r + 90) % 360)}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
            viewMode={viewMode}
          />
          
          <div className="flex-1 overflow-auto flex justify-center bg-gradient-to-b from-gray-100 to-gray-200 relative">
            {viewMode === 'preview' ? (
              <PDFViewer 
                url={pdfUrl} 
                scale={zoom}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                totalPages={totalPages}
                onDocumentLoad={handleDocumentLoad}
                rotation={rotation}
              />
            ) : (
              <>
                {/* Canva-style left toolbar */}
                {status === 'complete' && (
                  <CanvaToolbar
                    activeTool={activeTool}
                    onToolChange={setActiveTool}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    onUndo={undo}
                    onRedo={redo}
                    onClearAll={() => {
                      if (confirm('Clear all drawings?')) {
                        (window as any).__drawingCanvas?.clearCanvas?.();
                      }
                    }}
                    onExport={handleDownload}
                  />
                )}

                {/* Main edit area */}
                {renderEditMode()}
                
                {/* Color panel - bottom center when drawing tool active */}
                {status === 'complete' && activeTool !== 'select' && (
                  <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
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
              </>
            )}
          </div>
        </main>

        {/* AI Assistant Toggle Button */}
        {viewMode === 'edit' && status === 'complete' && !aiPanelOpen && (
          <Button
            variant="default"
            size="sm"
            onClick={() => setAiPanelOpen(true)}
            className="fixed right-4 bottom-4 z-50 shadow-lg"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            AI Assistant
          </Button>
        )}

        {/* AI Assistant Panel */}
        {viewMode === 'edit' && (
          <AIAssistantPanel
            isOpen={aiPanelOpen}
            onClose={() => setAiPanelOpen(false)}
            documentText={documentText}
          />
        )}

        <RightSidebar 
          isOpen={rightSidebarOpen} 
          onToggle={() => setRightSidebarOpen(!rightSidebarOpen)} 
        />
      </div>
    </div>
  );
};

export default EditorPage;
