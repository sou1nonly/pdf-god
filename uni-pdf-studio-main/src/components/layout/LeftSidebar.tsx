import { ChevronLeft, Grid, Bookmark, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface LeftSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  totalPages?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
}

export const LeftSidebar = ({ isOpen, onToggle, totalPages = 1, currentPage = 1, onPageChange }: LeftSidebarProps) => {
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
                  "aspect-[8.5/11] bg-muted rounded cursor-pointer transition-smooth hover:bg-muted/70 flex flex-col items-center justify-center p-2",
                  pageNum === currentPage ? "border-2 border-primary" : "border"
                )}
              >
                <span className={cn(
                  "text-xs font-medium",
                  pageNum === currentPage ? "" : "text-muted-foreground"
                )}>
                  Page {pageNum}
                </span>
                <div className="flex-1 w-full bg-background/50 rounded mt-1 flex items-center justify-center">
                  <span className="text-2xl font-bold text-muted-foreground/30">{pageNum}</span>
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
