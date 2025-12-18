import { 
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Undo2,
  Redo2,
  Hand,
  Stamp,
  Link as LinkIcon,
  MessageSquare,
  PenTool,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { DrawingTool } from "@/components/editor/DrawingCanvas";

const AnySlider = Slider as unknown as React.ComponentType<any>;

// Cast icons to fix TS version mismatch
const icons = {
  ChevronLeft: ChevronLeft as any,
  ChevronRight: ChevronRight as any,
  RotateCw: RotateCw as any,
  Undo2: Undo2 as any,
  Redo2: Redo2 as any,
  Hand: Hand as any,
  Stamp: Stamp as any,
  Link: LinkIcon as any,
  MessageSquare: MessageSquare as any,
  PenTool: PenTool as any,
  Trash2: Trash2 as any,
};

interface ToolbarProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onRotate: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  viewMode?: 'preview' | 'edit';
  activeTool?: DrawingTool;
  onToolChange?: (tool: DrawingTool) => void;
  onClearAll?: () => void;
}

export const Toolbar = ({ 
  zoom,
  onZoomChange,
  currentPage,
  totalPages,
  onPageChange,
  onRotate,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  viewMode = 'preview',
  activeTool,
  onToolChange,
  onClearAll,
}: ToolbarProps) => {
  const handlePageSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem('page') as HTMLInputElement;
    const page = parseInt(input.value);
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  const advancedTools = [
    { id: 'hand', icon: icons.Hand, label: 'Hand / Pan' },
    { id: 'callout', icon: icons.MessageSquare, label: 'Callout' },
    { id: 'link', icon: icons.Link, label: 'Link' },
  ];

  const stampTools = [
    { id: 'stamp-approved', label: 'Approved' },
    { id: 'stamp-draft', label: 'Draft' },
    { id: 'stamp-confidential', label: 'Confidential' },
  ];

  return (
    <div className="h-12 border-b bg-card flex items-center px-3 gap-2 shrink-0 overflow-x-auto">
      {/* Undo/Redo - Left side */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onUndo}
          disabled={!canUndo}
          className="h-8 w-8"
          title="Undo (Ctrl+Z)"
        >
          <icons.Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRedo}
          disabled={!canRedo}
          className="h-8 w-8"
          title="Redo (Ctrl+Y)"
        >
          <icons.Redo2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="w-px h-6 bg-border shrink-0" />

      {/* Page Navigation */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="h-8 w-8"
          title="Previous Page"
        >
          <icons.ChevronLeft className="h-4 w-4" />
        </Button>
        <form onSubmit={handlePageSubmit} className="flex items-center gap-1">
          <Input 
            name="page"
            className="w-10 h-7 text-center p-0 text-sm" 
            defaultValue={currentPage}
            key={currentPage} 
          />
          <span className="text-xs text-muted-foreground whitespace-nowrap">/ {totalPages}</span>
        </form>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="h-8 w-8"
          title="Next Page"
        >
          <icons.ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Zoom Slider - Only show in edit mode */}
      {viewMode === 'edit' && (
        <>
          <div className="w-px h-6 bg-border shrink-0" />
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground w-8">{zoom}%</span>
            <AnySlider
              value={[zoom]}
              onValueChange={([val]: number[]) => onZoomChange(val)}
              min={25}
              max={300}
              step={5}
              className="w-24 lg:w-32"
            />
          </div>
        </>
      )}

      <div className="w-px h-6 bg-border shrink-0" />

      {/* Rotate */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onRotate}
        className="h-8 w-8"
        title="Rotate Page"
      >
        <icons.RotateCw className="h-4 w-4" />
      </Button>

      {/* Advanced Tools - Only in Edit Mode */}
      {viewMode === 'edit' && onToolChange && (
        <>
          <div className="w-px h-6 bg-border shrink-0" />
          
          <div className="flex items-center gap-1">
            {/* Hand, Callout, Link */}
            {advancedTools.map((tool) => (
              <Button
                key={tool.id}
                variant={activeTool === tool.id ? "default" : "ghost"}
                size="icon"
                onClick={() => onToolChange(tool.id as DrawingTool)}
                className={cn("h-8 w-8", activeTool === tool.id && "bg-primary text-primary-foreground")}
                title={tool.label}
              >
                <tool.icon className="h-4 w-4" />
              </Button>
            ))}

            {/* Signature */}
            <Button
              variant={activeTool === 'signature' ? "default" : "ghost"}
              size="icon"
              onClick={() => onToolChange('signature' as DrawingTool)}
              className={cn("h-8 w-8", activeTool === 'signature' && "bg-primary text-primary-foreground")}
              title="Signature"
            >
              <icons.PenTool className="h-4 w-4" />
            </Button>

            {/* Stamps Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={activeTool?.startsWith('stamp') ? "default" : "ghost"}
                  size="icon"
                  className={cn("h-8 w-8", activeTool?.startsWith('stamp') && "bg-primary text-primary-foreground")}
                  title="Stamps"
                >
                  <icons.Stamp className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {stampTools.map((stamp) => (
                  <DropdownMenuItem 
                    key={stamp.id}
                    onClick={() => onToolChange(stamp.id as DrawingTool)}
                    className="gap-2"
                  >
                    <icons.Stamp className="h-4 w-4" />
                    <span>{stamp.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="w-px h-6 bg-border shrink-0 mx-1" />

            {/* Clear All */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClearAll}
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              title="Clear All"
            >
              <icons.Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
