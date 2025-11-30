import { ChevronLeft, Grid, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

interface LeftSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  totalPages?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  pdfDocument?: any;
}

export const LeftSidebar = ({ isOpen, onToggle, totalPages = 1, currentPage = 1, onPageChange, pdfDocument }: LeftSidebarProps) => {
  const [thumbnails, setThumbnails] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    if (!pdfDocument || !isOpen) return;

    const loadThumbnails = async () => {
      try {
        const thumbs: { [key: number]: string } = {};
        const numPages = pdfDocument.numPages;
        
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          if (thumbnails[pageNum]) continue;

          try {
            const page = await pdfDocument.getPage(pageNum);
            const viewport = page.getViewport({ scale: 0.2 });
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (!context) continue;
            
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            await page.render({
              canvasContext: context,
              viewport,
            }).promise;
            
            thumbs[pageNum] = canvas.toDataURL();
            
            if (pageNum % 5 === 0 || pageNum === numPages) {
              setThumbnails(prev => ({ ...prev, ...thumbs }));
            }
          } catch (err) {
            console.error(`Error generating thumbnail for page ${pageNum}`, err);
          }
        }
      } catch (error) {
        console.error('Error loading thumbnails:', error);
      }
    };

    loadThumbnails();
  }, [pdfDocument, isOpen]);

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
    <aside className="w-64 border-r bg-card flex flex-col shrink-0 h-full">
      <div className="h-12 border-b flex items-center justify-between px-3 shrink-0">
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

      <Tabs defaultValue="thumbnails" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid w-full grid-cols-2 m-2 shrink-0">
          <TabsTrigger value="thumbnails" className="text-xs">
            <Grid className="h-3 w-3 mr-1" />
            Pages
          </TabsTrigger>
          <TabsTrigger value="bookmarks" className="text-xs">
            <Bookmark className="h-3 w-3 mr-1" />
            Marks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="thumbnails" className="flex-1 overflow-y-auto p-2">
          <div className="grid grid-cols-1 gap-4 px-2">
            {pdfDocument && Array.from({ length: pdfDocument.numPages }, (_, i) => i + 1).map((pageNum) => (
              <div
                key={pageNum}
                className={cn(
                  "cursor-pointer rounded-md border-2 p-2 transition-all hover:border-primary/50 flex flex-col items-center gap-2",
                  currentPage === pageNum ? "border-primary bg-primary/5" : "border-transparent"
                )}
                onClick={() => onPageChange?.(pageNum)}
              >
                <div className="w-full aspect-[3/4] bg-muted rounded-sm overflow-hidden relative shadow-sm">
                  {thumbnails[pageNum] ? (
                    <img 
                      src={thumbnails[pageNum]} 
                      alt={`Page ${pageNum}`} 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                      Loading...
                    </div>
                  )}
                </div>
                <span className="text-xs font-medium text-muted-foreground">Page {pageNum}</span>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="bookmarks" className="flex-1 overflow-auto p-3 m-0">
          <div className="text-sm text-muted-foreground text-center py-8">
            No bookmarks yet
          </div>
        </TabsContent>
      </Tabs>
    </aside>
  );
};
