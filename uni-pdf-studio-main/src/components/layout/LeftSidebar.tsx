import { ChevronLeft, Grid, Bookmark, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

// Configure PDF.js worker - use CDN for reliability
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface LeftSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  totalPages?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  pdfUrl?: string;
}

export const LeftSidebar = ({ isOpen, onToggle, totalPages = 1, currentPage = 1, onPageChange, pdfUrl }: LeftSidebarProps) => {
  const [thumbnails, setThumbnails] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    if (!pdfUrl || !isOpen) return;

    const loadThumbnails = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        
        const thumbs: { [key: number]: string } = {};
        
        // Generate thumbnails for all pages
        for (let pageNum = 1; pageNum <= Math.min(totalPages, pdf.numPages); pageNum++) {
          const page = await pdf.getPage(pageNum);
          
          // Create a smaller viewport for thumbnail
          const viewport = page.getViewport({ scale: 0.4 });
          
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) continue;
          
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          
          await page.render({
            canvas,
            canvasContext: context,
            viewport,
          }).promise;
          
          thumbs[pageNum] = canvas.toDataURL();
        }
        
        setThumbnails(thumbs);
      } catch (error) {
        console.error('Error loading thumbnails:', error);
      }
    };

    loadThumbnails();
  }, [pdfUrl, totalPages, isOpen]);

  if (!isOpen) {
    return (
      <div className="w-12 border-r bg-card flex flex-col items-center py-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="mb-2"
        >
          <Grid className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <aside className="w-64 border-r bg-card flex flex-col shrink-0">
      <div className="h-12 border-b flex items-center justify-between px-3">
        <h3 className="font-semibold text-sm">Navigation</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="thumbnails" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 m-2">
          <TabsTrigger value="thumbnails" className="text-xs">
            <Grid className="h-3 w-3 mr-1" />
            Pages
          </TabsTrigger>
          <TabsTrigger value="bookmarks" className="text-xs">
            <Bookmark className="h-3 w-3 mr-1" />
            Marks
          </TabsTrigger>
          <TabsTrigger value="search" className="text-xs">
            <Search className="h-3 w-3 mr-1" />
            Search
          </TabsTrigger>
        </TabsList>

        <TabsContent value="thumbnails" className="flex-1 overflow-auto p-3 m-0">
          <div className="space-y-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <div
                key={pageNum}
                onClick={() => onPageChange?.(pageNum)}
                className={cn(
                  "relative rounded cursor-pointer transition-smooth hover:opacity-80",
                  pageNum === currentPage ? "ring-2 ring-primary" : "ring-1 ring-border"
                )}
              >
                {thumbnails[pageNum] ? (
                  <img
                    src={thumbnails[pageNum]}
                    alt={`Page ${pageNum}`}
                    className="w-full h-auto rounded"
                  />
                ) : (
                  <div className="aspect-[8.5/11] bg-muted rounded flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">Loading...</span>
                  </div>
                )}
                <div className={cn(
                  "absolute bottom-1 right-1 px-2 py-0.5 rounded text-xs font-medium",
                  pageNum === currentPage 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-background/80 text-muted-foreground"
                )}>
                  {pageNum}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="bookmarks" className="flex-1 overflow-auto p-3 m-0">
          <div className="text-sm text-muted-foreground text-center py-8">
            No bookmarks yet
          </div>
        </TabsContent>

        <TabsContent value="search" className="flex-1 flex flex-col p-3 m-0">
          <Input
            placeholder="Search document..."
            className="mb-3"
          />
          <div className="text-sm text-muted-foreground text-center py-8">
            Enter a search term
          </div>
        </TabsContent>
      </Tabs>
    </aside>
  );
};
