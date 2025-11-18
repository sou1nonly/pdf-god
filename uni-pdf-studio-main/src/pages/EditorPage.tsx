import { useState, useEffect } from "react";
import { FileText, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Toolbar } from "@/components/layout/Toolbar";
import { LeftSidebar } from "@/components/layout/LeftSidebar";
import { RightSidebar } from "@/components/layout/RightSidebar";
import { TopBar } from "@/components/layout/TopBar";
import { PDFEditorV3 } from "@/components/editor/PDFEditorV3";
import { EditorModeProvider } from "@/contexts/EditorModeContext";
import { EditorToolbar, EditorTool } from "@/components/editor/EditorToolbar";
import { DocumentsList } from "@/components/document/DocumentsList";
import { toast } from "sonner";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const EditorPage = () => {
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [fileName, setFileName] = useState("Untitled Document");
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [activeTool, setActiveTool] = useState<EditorTool>('select');
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Editor state
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [textColor, setTextColor] = useState('#000000');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [highlightColor, setHighlightColor] = useState('#FFFF00');
  const [highlightMode, setHighlightMode] = useState<'rectangle' | 'pen'>('rectangle');
  const [stampText, setStampText] = useState('APPROVED');
  const [stampColor, setStampColor] = useState('#FF0000');
  const [fillColor, setFillColor] = useState('#87CEEB');
  const [fillOpacity, setFillOpacity] = useState(50);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [selectedObjectType, setSelectedObjectType] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);

  const docId = searchParams.get('id');

  // Undo/Redo handlers
  const handleUndo = () => {
    if ((window as any).editorUndo) {
      (window as any).editorUndo();
    }
  };

  const handleRedo = () => {
    if ((window as any).editorRedo) {
      (window as any).editorRedo();
    }
  };

  const handleHistoryChange = (undo: boolean, redo: boolean) => {
    setCanUndo(undo);
    setCanRedo(redo);
  };

  const handleObjectSelected = (objectType: string | null, properties?: any) => {
    setSelectedObjectType(objectType);
    
    // Update toolbar controls with selected object's properties
    if (properties) {
      if (properties.fill && (objectType === 'rect' || objectType === 'circle')) {
        setFillColor(properties.fill);
      }
      if (properties.opacity !== undefined) {
        // Convert from 0-1 to 0-100 and ensure it's a valid number
        const opacityPercent = Math.round(properties.opacity * 100);
        setFillOpacity(Math.max(0, Math.min(100, opacityPercent)));
      }
      if (properties.stroke) {
        setStrokeColor(properties.stroke);
      }
      if (properties.strokeWidth !== undefined) {
        setStrokeWidth(properties.strokeWidth);
      }
      if (properties.fill && objectType === 'i-text') {
        setTextColor(properties.fill);
      }
      if (properties.fontSize) {
        setFontSize(properties.fontSize);
      }
      if (properties.fontFamily) {
        setFontFamily(properties.fontFamily);
      }
      if (properties.fontWeight) {
        setIsBold(properties.fontWeight === 'bold');
      }
      if (properties.fontStyle) {
        setIsItalic(properties.fontStyle === 'italic');
      }
    }
  };

  const handlePageCountChange = (pages: number) => {
    setTotalPages(pages);
  };

  // Load PDF from URL parameter
  useEffect(() => {
    const loadDocument = async () => {
      if (!docId || !user) {
        return; // Just show documents list if no ID
      }

      try {
        console.log('Loading document with ID:', docId);
        
        // Get document details from database
        const { data: document, error: docError } = await (supabase as any)
          .from('documents')
          .select('*')
          .eq('id', docId)
          .single();

        if (docError) {
          console.error('Database error:', docError);
          throw docError;
        }
        
        if (!document) {
          toast.error("Document not found");
          navigate('/editor');
          return;
        }

        console.log('Document found:', document);
        console.log('Storage path:', document.storage_path);

        // Get signed URL for the document
        const { data: urlData, error: urlError } = await supabase
          .storage
          .from('documents')
          .createSignedUrl(document.storage_path, 3600); // 1 hour expiry

        if (urlError) {
          console.error('Storage error:', urlError);
          toast.error(`Failed to load document: ${urlError.message}`);
          return;
        }
        
        if (!urlData) {
          toast.error("Failed to get document URL");
          return;
        }

        console.log('Signed URL created:', urlData.signedUrl);
        setPdfUrl(urlData.signedUrl);
        setFileName(document.file_name);
      } catch (error: any) {
        console.error('Error loading document:', error);
        toast.error(`Failed to load document: ${error.message || 'Unknown error'}`);
        navigate('/editor');
      }
    };

    loadDocument();
  }, [searchParams, user, docId, navigate]);

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

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleSave = () => {
    toast.success("Document saved successfully!");
  };

  const handleDownload = () => {
    toast.success("Preparing download...");
  };

  // If no document is selected, show documents list
  if (!docId) {
    return (
      <div className="flex flex-col h-screen w-full overflow-hidden bg-background">
        <TopBar 
          fileName="My Documents" 
          onFileNameChange={() => {}}
          onSave={() => navigate('/')}
          onDownload={() => navigate('/')}
        />
        
        <div className="flex-1 overflow-auto p-8">
          <DocumentsList />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background">
      <TopBar 
        fileName={fileName} 
        onFileNameChange={setFileName}
        onSave={handleSave}
        onDownload={handleDownload}
      />
      
      <EditorToolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        fontFamily={fontFamily}
        onFontFamilyChange={setFontFamily}
        textColor={textColor}
        onTextColorChange={setTextColor}
        isBold={isBold}
        isItalic={isItalic}
        onToggleBold={() => setIsBold(!isBold)}
        onToggleItalic={() => setIsItalic(!isItalic)}
        strokeWidth={strokeWidth}
        onStrokeWidthChange={setStrokeWidth}
        strokeColor={strokeColor}
        onStrokeColorChange={setStrokeColor}
        highlightColor={highlightColor}
        onHighlightColorChange={setHighlightColor}
        highlightMode={highlightMode}
        onHighlightModeChange={setHighlightMode}
        stampText={stampText}
        onStampTextChange={setStampText}
        stampColor={stampColor}
        onStampColorChange={setStampColor}
        fillColor={fillColor}
        onFillColorChange={setFillColor}
        fillOpacity={fillOpacity}
        onFillOpacityChange={setFillOpacity}
        selectedObjectType={selectedObjectType}
      />

      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar 
          isOpen={leftSidebarOpen} 
          onToggle={() => setLeftSidebarOpen(!leftSidebarOpen)}
          totalPages={totalPages}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          pdfUrl={pdfUrl}
        />

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto">
            {pdfUrl ? (
              <EditorModeProvider>
                <PDFEditorV3
                  url={pdfUrl}
                  currentPage={currentPage}
                  zoom={zoom}
                  rotation={rotation}
                  activeTool={activeTool}
                  fontSize={fontSize}
                  fontFamily={fontFamily}
                  textColor={textColor}
                  isBold={isBold}
                  isItalic={isItalic}
                  strokeWidth={strokeWidth}
                  strokeColor={strokeColor}
                  highlightColor={highlightColor}
                  highlightMode={highlightMode}
                  stampText={stampText}
                  stampColor={stampColor}
                  fillColor={fillColor}
                  fillOpacity={fillOpacity}
                  onHistoryChange={(canUndo, canRedo) => {
                    setCanUndo(canUndo);
                    setCanRedo(canRedo);
                  }}
                  onPageCountChange={setTotalPages}
                  onZoomChange={setZoom}
                />
              </EditorModeProvider>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>No document loaded</p>
              </div>
            )}
          </div>

          <div className="h-12 border-t bg-card flex items-center justify-between px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePreviousPage}
                  disabled={currentPage <= 1}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span>Page {currentPage} of {totalPages}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages}
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleZoomOut}
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Zoom Out</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <span className="text-sm font-medium min-w-[50px] text-center">{zoom}%</span>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleZoomIn}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Zoom In</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
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
