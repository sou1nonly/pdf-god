import { ChevronLeft, Grid, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useEffect, useState, useRef } from "react";
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
            // Increased quality by 20% (0.15 * 1.2 = 0.18)
            const viewport = page.getViewport({ scale: 0.18 });

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

  // Scroll active thumbnail into view (debounced)
  useEffect(() => {
    if (!isOpen || !currentPage) return;

    // Debounce to avoid rapid DOM queries during fast navigation
    const timer = setTimeout(() => {
      const element = document.getElementById(`thumbnail-${currentPage}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);

    return () => clearTimeout(timer);
  }, [currentPage, isOpen]);

  if (!isOpen) {
    return (
      <div className="w-12 h-full border-r bg-card flex flex-col items-center py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="mb-2 hover:bg-muted"
        >
          <Grid className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <aside className="w-52 border-r bg-card flex flex-col shrink-0 h-full shadow-soft z-20">
      <div className="h-14 border-b flex items-center justify-between px-3 shrink-0 bg-white/50 backdrop-blur-sm">
        <h3 className="font-semibold text-sm text-foreground/80">Navigation</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="thumbnails" className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 mt-4">
          <TabsList className="grid w-full grid-cols-2 bg-muted/40 p-1 rounded-xl h-auto">
            <TabsTrigger
              value="thumbnails"
              className="text-xs py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
            >
              <Grid className="h-3.5 w-3.5 mr-1.5" />
              Pages
            </TabsTrigger>
            <TabsTrigger
              value="bookmarks"
              className="text-xs py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
            >
              <Bookmark className="h-3.5 w-3.5 mr-1.5" />
              Marks
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="thumbnails" className="flex-1 overflow-y-auto p-2 mt-2 scroll-smooth">
          <div className="grid grid-cols-1 gap-2">
            {pdfDocument && Array.from({ length: pdfDocument.numPages }, (_, i) => i + 1).map((pageNum) => (
              <div
                key={pageNum}
                id={`thumbnail-${pageNum}`}
                className={cn(
                  "cursor-pointer rounded-xl border-2 p-2 transition-all hover:border-primary/30 hover:bg-primary/5 flex flex-col items-center gap-2 group",
                  currentPage === pageNum
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-transparent bg-card/50"
                )}
                onClick={() => onPageChange?.(pageNum)}
              >
                <div className="w-full aspect-[3/4] bg-white rounded-lg overflow-hidden relative shadow-sm border border-border/10 group-hover:shadow-md transition-shadow">
                  {thumbnails[pageNum] ? (
                    <img
                      src={thumbnails[pageNum]}
                      alt={`Page ${pageNum}`}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground/50 bg-muted/30">
                      Loading...
                    </div>
                  )}
                </div>
                <span className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded-full",
                  currentPage === pageNum ? "bg-primary text-white" : "text-muted-foreground bg-muted/50"
                )}>
                  Page {pageNum}
                </span>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="bookmarks" className="flex-1 overflow-auto p-4 m-0">
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <Bookmark className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No bookmarks yet</p>
          </div>
        </TabsContent>
      </Tabs>
    </aside>
  );
};
