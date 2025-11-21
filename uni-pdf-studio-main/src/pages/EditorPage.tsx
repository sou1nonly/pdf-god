import { useState, useEffect } from "react";
import { FileText, ZoomIn, ZoomOut } from "lucide-react";
import { Toolbar } from "@/components/layout/Toolbar";
import { LeftSidebar } from "@/components/layout/LeftSidebar";
import { RightSidebar } from "@/components/layout/RightSidebar";
import { TopBar } from "@/components/layout/TopBar";
import { PDFViewer } from "@/components/document/PDFViewer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const EditorPage = () => {
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [fileName, setFileName] = useState("Untitled Document");
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [activeTool, setActiveTool] = useState<string>('select');

  const totalPages = 1; // Will be dynamic when PDF is loaded

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

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background">
      <TopBar 
        fileName={fileName} 
        onFileNameChange={setFileName}
        onSave={handleSave}
        onDownload={handleDownload}
      />
      
      <Toolbar activeTool={activeTool} onToolChange={setActiveTool} />

      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar 
          isOpen={leftSidebarOpen} 
          onToggle={() => setLeftSidebarOpen(!leftSidebarOpen)}
        />

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto bg-muted/30">
            <PDFViewer
              initialZoom={zoom}
              onPageChange={setCurrentPage}
              onZoomChange={setZoom}
            />
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
