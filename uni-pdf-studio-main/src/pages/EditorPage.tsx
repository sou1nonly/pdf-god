import { useState, useEffect } from "react";
import { FileText, ZoomIn, ZoomOut, Upload } from "lucide-react";
import { Toolbar } from "@/components/layout/Toolbar";
import { LeftSidebar } from "@/components/layout/LeftSidebar";
import { RightSidebar } from "@/components/layout/RightSidebar";
import { TopBar } from "@/components/layout/TopBar";
import { PDFViewer } from "@/components/document/PDFViewer";
import { HydratedPageView } from "@/components/editor/HydratedPageView";
import { useHydrationEngine } from "@/hooks/engine/useHydrationEngine";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const EditorPage = () => {
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [fileName, setFileName] = useState("Untitled Document");
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [activeTool, setActiveTool] = useState<string>('select');
  const [viewMode, setViewMode] = useState<'classic' | 'hydrated'>('classic');

  const { processFile, pages, status, progress } = useHydrationEngine();

  const totalPages = pages ? pages.length : 1;

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

  const handleDownload = () => {
    toast.success("Preparing download...");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      if (viewMode === 'hydrated') {
        processFile(file);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background">
      <TopBar 
        fileName={fileName} 
        onFileNameChange={setFileName}
        onSave={handleSave}
        onDownload={handleDownload}
      />
      
      <div className="flex items-center gap-4 px-4 py-2 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <Button 
            variant={viewMode === 'classic' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewMode('classic')}
          >
            Classic View
          </Button>
          <Button 
            variant={viewMode === 'hydrated' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewMode('hydrated')}
          >
            Hydrated View (Beta)
          </Button>
        </div>
        
        {viewMode === 'hydrated' && (
          <div className="flex items-center gap-2">
            <input 
              type="file" 
              id="pdf-upload" 
              accept=".pdf" 
              className="hidden" 
              onChange={handleFileUpload}
            />
            <Button size="sm" variant="secondary" onClick={() => document.getElementById('pdf-upload')?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Load PDF for Hydration
            </Button>
            {status === 'processing' && <span className="text-xs text-muted-foreground">Processing... {progress}%</span>}
            {status === 'error' && <span className="text-xs text-red-500">Error processing PDF</span>}
          </div>
        )}
      </div>

      <Toolbar activeTool={activeTool} onToolChange={setActiveTool} />

      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar 
          isOpen={leftSidebarOpen} 
          onToggle={() => setLeftSidebarOpen(!leftSidebarOpen)}
        />

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto bg-muted/30 p-8">
            {viewMode === 'classic' ? (
              <PDFViewer
                initialZoom={zoom}
                onPageChange={setCurrentPage}
                onZoomChange={setZoom}
              />
            ) : (
              <div className="flex flex-col items-center gap-8">
                {status === 'complete' && pages ? (
                  pages.map(page => (
                    <HydratedPageView 
                      key={page.pageIndex} 
                      page={page} 
                      scale={zoom / 100} 
                    />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    {status === 'processing' ? (
                      <p>Analyzing document structure...</p>
                    ) : (
                      <p>Upload a PDF to see the hydrated editable view</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="h-12 border-t bg-card flex items-center justify-between px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>Page {currentPage} of {totalPages}</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= 10}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              
              <span className="text-sm font-medium min-w-[60px] text-center">
                {zoom}%
              </span>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= 500}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            <div className="w-32" /> {/* Spacer for balance */}
          </div>
        </main>

        <RightSidebar 
          isOpen={rightSidebarOpen} 
          onToggle={() => setRightSidebarOpen(!rightSidebarOpen)}
        />
      </div>
    </div>
  );
};

export default EditorPage;
