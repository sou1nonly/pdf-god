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
  Trash2,
  Eye,
  Edit,
  ArrowLeftRight,
  ZoomIn,
  ZoomOut
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
  Eye: Eye as any,
  Edit: Edit as any,
  ArrowLeftRight: ArrowLeftRight as any,
  ZoomIn: ZoomIn as any,
  ZoomOut: ZoomOut as any,
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

  onViewModeChange?: (mode: 'preview' | 'edit') => void;
  onClearAll?: () => void;
  zoomMode?: 'fit-width' | 'original' | 'custom';
  onZoomModeChange?: (mode: 'fit-width' | 'original' | 'custom') => void;
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
  onViewModeChange,
  activeTool,
  onToolChange,

  onClearAll,
  zoomMode = 'fit-width',
  onZoomModeChange,
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
    <div className="h-14 border-b bg-card/80 backdrop-blur-md flex items-center px-4 gap-3 shrink-0 overflow-x-auto shadow-sm z-10">
      {/* View Mode Toggle */}
      {onViewModeChange && (
        <>
          <div className="flex items-center bg-muted/50 p-1 rounded-lg border border-border/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewModeChange('preview')}
              className={cn(
                "h-7 px-3 rounded-md text-xs font-medium transition-all",
                viewMode === 'preview'
                  ? "bg-background text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-transparent"
              )}
            >
              <icons.Eye className="h-4 w-4 mr-1.5" />
              Preview
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewModeChange('edit')}
              className={cn(
                "h-7 px-3 rounded-md text-xs font-medium transition-all",
                viewMode === 'edit'
                  ? "bg-background text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-transparent"
              )}
            >
              <icons.Edit className="h-4 w-4 mr-1.5" />
              Edit
            </Button>
          </div>
          <div className="w-px h-8 bg-border/50 shrink-0" />
        </>
      )}

      {/* Undo/Redo - Left side */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onUndo}
          disabled={!canUndo}
          className="h-9 w-9 rounded-lg hover:bg-muted text-foreground/80"
          title="Undo (Ctrl+Z)"
        >
          <icons.Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRedo}
          disabled={!canRedo}
          className="h-9 w-9 rounded-lg hover:bg-muted text-foreground/80"
          title="Redo (Ctrl+Y)"
        >
          <icons.Redo2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="w-px h-8 bg-border/50 shrink-0" />

      {/* Page Navigation */}
      <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg border border-border/30">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="h-7 w-7 rounded-md"
          title="Previous Page"
        >
          <icons.ChevronLeft className="h-4 w-4" />
        </Button>
        <form onSubmit={handlePageSubmit} className="flex items-center gap-1 px-1">
          <Input
            name="page"
            className="w-12 h-7 text-center p-0 text-sm border-transparent bg-transparent focus:bg-background focus:ring-1 transition-all"
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
          className="h-7 w-7 rounded-md"
          title="Next Page"
        >
          <icons.ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center gap-1.5 border-l border-r border-border/40 px-3 mx-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 bg-muted/20 hover:bg-muted font-medium text-xs w-[100px] justify-between">
              {zoomMode === 'fit-width' ? 'Fit Width' : `${Math.round(zoom)}%`}
              <icons.ChevronRight className="h-3 w-3 rotate-90 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[120px]">
            <DropdownMenuItem onClick={() => onZoomModeChange?.('fit-width')} className="text-xs gap-2">
              <icons.ArrowLeftRight className="h-3.5 w-3.5" /> Fit Width
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { onZoomChange(100); onZoomModeChange?.('custom'); }} className="text-xs gap-2">
              100%
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { onZoomChange(150); onZoomModeChange?.('custom'); }} className="text-xs gap-2">
              150%
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { onZoomChange(200); onZoomModeChange?.('custom'); }} className="text-xs gap-2">
              200%
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center bg-muted/20 rounded-md border border-border/20">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              onZoomChange(Math.max(10, zoom - 10));
              onZoomModeChange?.('custom');
            }}
            className="h-8 w-8 hover:bg-background rounded-l-md"
            title="Zoom Out"
          >
            <icons.ZoomOut className="h-4 w-4 text-muted-foreground" />
          </Button>
          <div className="w-px h-4 bg-border/20" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              onZoomChange(Math.max(10, zoom + 10));
              onZoomModeChange?.('custom');
            }}
            className="h-8 w-8 hover:bg-background rounded-r-md"
            title="Zoom In"
          >
            <icons.ZoomIn className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Rotate */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onRotate}
        className="h-9 w-9 rounded-lg hover:bg-muted text-foreground/80"
        title="Rotate Page"
      >
        <icons.RotateCw className="h-4 w-4" />
      </Button>

      {/* Advanced Tools - Only in Edit Mode */}
      {viewMode === 'edit' && onToolChange && (
        <>
          <div className="w-px h-8 bg-border/50 shrink-0" />

          <div className="flex items-center gap-1.5 preferences-group">
            {/* Hand, Callout, Link */}
            {advancedTools.map((tool) => (
              <Button
                key={tool.id}
                variant={activeTool === tool.id ? "default" : "ghost"}
                size="icon"
                onClick={() => onToolChange(tool.id as DrawingTool)}
                className={cn(
                  "h-9 w-9 rounded-lg transition-all",
                  activeTool === tool.id
                    ? "bg-pastel-blue text-blue-900 shadow-sm hover:bg-pastel-blue-dark"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
                title={tool.label}
              >
                <tool.icon className="h-4.5 w-4.5" />
              </Button>
            ))}

            {/* Signature */}
            <Button
              variant={activeTool === 'signature' ? "default" : "ghost"}
              size="icon"
              onClick={() => onToolChange('signature' as DrawingTool)}
              className={cn(
                "h-9 w-9 rounded-lg transition-all",
                activeTool === 'signature'
                  ? "bg-pastel-purple text-purple-900 shadow-sm hover:bg-pastel-purple-dark"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
              title="Signature"
            >
              <icons.PenTool className="h-4.5 w-4.5" />
            </Button>

            {/* Stamps Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={activeTool?.startsWith('stamp') ? "default" : "ghost"}
                  size="icon"
                  className={cn(
                    "h-9 w-9 rounded-lg transition-all",
                    activeTool?.startsWith('stamp')
                      ? "bg-pastel-orange text-orange-900 shadow-sm hover:bg-pastel-orange-dark"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                  title="Stamps"
                >
                  <icons.Stamp className="h-4.5 w-4.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="rounded-xl border-border/50 shadow-soft">
                {stampTools.map((stamp) => (
                  <DropdownMenuItem
                    key={stamp.id}
                    onClick={() => onToolChange(stamp.id as DrawingTool)}
                    className="gap-2 focus:bg-primary/5 cursor-pointer"
                  >
                    <icons.Stamp className="h-4 w-4 text-pastel-orange" />
                    <span>{stamp.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="w-px h-8 bg-border/50 shrink-0 mx-2" />

            {/* Clear All */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClearAll}
              className="h-9 w-9 rounded-lg text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Clear All"
            >
              <icons.Trash2 className="h-4.5 w-4.5" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
