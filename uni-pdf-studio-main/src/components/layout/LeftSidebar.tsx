import { ChevronLeft, Grid, Bookmark, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

interface LeftSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const LeftSidebar = ({ isOpen, onToggle }: LeftSidebarProps) => {
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
            <div className="aspect-[8.5/11] bg-muted rounded border-2 border-primary flex items-center justify-center hover:bg-muted/70 transition-smooth cursor-pointer">
              <span className="text-xs font-medium">Page 1</span>
            </div>
            <div className="aspect-[8.5/11] bg-muted rounded border flex items-center justify-center hover:bg-muted/70 transition-smooth cursor-pointer">
              <span className="text-xs font-medium text-muted-foreground">Page 2</span>
            </div>
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
