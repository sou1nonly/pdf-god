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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { DrawingTool } from "@/components/editor/types";
import { RichTooltip } from "@/components/ui/tooltip-helpers";

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
  onDelete?: () => void;
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

  onDelete,
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
    { id: 'callout', icon: icons.MessageSquare, label: 'Callout', description: 'Add annotation box' },
    { id: 'link', icon: icons.Link, label: 'Link', description: 'Add hyperlink' },
  ];

  const stampTools = [
    { id: 'stamp-approved', label: 'Approved' },
    { id: 'stamp-draft', label: 'Draft' },
    { id: 'stamp-confidential', label: 'Confidential' },
  ];

  return (
    <TooltipProvider delayDuration={1000}>
      <div className="h-14 border-b bg-card/95 backdrop-blur-sm flex items-center px-4 gap-3 shrink-0 overflow-x-auto shadow-sm z-10 overflow-visible justify-center relative">
        {/* View Mode Toggle */}
        {onViewModeChange && (
          <>
            <div className="flex items-center bg-muted/30 p-1 rounded-lg border border-border transition-all shadow-sm">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewModeChange('preview')}
                    className={cn(
                      "h-8 px-4 rounded-md text-xs font-semibold transition-all border border-transparent",
                      viewMode === 'preview'
                        ? "bg-background text-primary shadow-sm border-border/50"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    )}
                  >
                    <icons.Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8} className="bg-foreground text-background border-border/50">
                  <RichTooltip title="Preview Mode" description="View document as is" />
                </TooltipContent>
              </Tooltip>

              <div className="w-px h-4 bg-border/40 mx-1" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewModeChange('edit')}
                    className={cn(
                      "h-8 px-4 rounded-md text-xs font-semibold transition-all border border-transparent",
                      viewMode === 'edit'
                        ? "bg-background text-primary shadow-sm border-border/50"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    )}
                  >
                    <icons.Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8} className="bg-foreground text-background border-border/50">
                  <RichTooltip title="Edit Mode" description="Make changes to document" />
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="w-px h-8 bg-border/60 shrink-0 mx-1" />
          </>
        )}

        {/* Undo/Redo - Left side */}
        <div className="flex items-center gap-1 border border-border/40 rounded-lg p-0.5 bg-background/50">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onUndo}
                disabled={!canUndo}
                className="h-8 w-8 rounded-md hover:bg-muted text-foreground/80 disabled:opacity-30"
              >
                <icons.Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={8} className="bg-foreground text-background border-border/50">
              <RichTooltip title="Undo" shortcut="Ctrl+Z" description="Revert last action" />
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onRedo}
                disabled={!canRedo}
                className="h-8 w-8 rounded-md hover:bg-muted text-foreground/80 disabled:opacity-30"
              >
                <icons.Redo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={8} className="bg-foreground text-background border-border/50">
              <RichTooltip title="Redo" shortcut="Ctrl+Y" description="Redo reverted action" />
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="w-px h-8 bg-border/60 shrink-0 mx-1" />

        {/* Page Navigation */}
        <div className="flex items-center gap-1 bg-background border border-border rounded-lg p-0.5 shadow-sm">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="h-8 w-8 rounded-md hover:bg-muted"
              >
                <icons.ChevronLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={8} className="bg-foreground text-background border-border/50">
              <RichTooltip title="Previous" description="Go to previous page" />
            </TooltipContent>
          </Tooltip>

          <form onSubmit={handlePageSubmit} className="flex items-center gap-1 px-1 min-w-[80px] justify-center border-l border-r border-border/30 h-8 mx-1">
            <Input
              name="page"
              className="w-10 h-7 text-center p-0 text-sm border-transparent bg-transparent focus:bg-muted/50 focus:ring-0 transition-all font-medium"
              defaultValue={currentPage}
              key={currentPage}
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap select-none">/ {totalPages}</span>
          </form>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
                className="h-8 w-8 rounded-md hover:bg-muted"
              >
                <icons.ChevronRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={8} className="bg-foreground text-background border-border/50">
              <RichTooltip title="Next" description="Go to next page" />
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="w-px h-8 bg-border/60 shrink-0 mx-1" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5 border border-border rounded-lg p-0.5 bg-background shadow-sm">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-3 hover:bg-muted font-medium text-xs w-[110px] justify-between border-r border-border/30 rounded-r-none mr-0.5">
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

          <div className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    onZoomChange(Math.max(10, zoom - 10));
                    onZoomModeChange?.('custom');
                  }}
                  className="h-8 w-8 hover:bg-muted rounded-none first:rounded-l-md border-r border-border/30"
                >
                  <icons.ZoomOut className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8} className="bg-foreground text-background border-border/50">
                <RichTooltip title="Zoom Out" description="Decrease magnification" />
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    onZoomChange(Math.max(10, zoom + 10));
                    onZoomModeChange?.('custom');
                  }}
                  className="h-8 w-8 hover:bg-muted rounded-none last:rounded-r-md"
                >
                  <icons.ZoomIn className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8} className="bg-foreground text-background border-border/50">
                <RichTooltip title="Zoom In" description="Increase magnification" />
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Rotate */}
        <div className="flex items-center border border-border/40 rounded-lg p-0.5 bg-background/50 ml-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onRotate}
                className="h-8 w-8 rounded-md hover:bg-muted text-foreground/80"
              >
                <icons.RotateCw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={8} className="bg-foreground text-background border-border/50">
              <RichTooltip title="Rotate" description="Rotate page 90°" />
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Advanced Tools - Only in Edit Mode */}
        {viewMode === 'edit' && onToolChange && (
          <>
            <div className="w-px h-8 bg-border/60 shrink-0 mx-2" />

            <div className="flex items-center gap-1 preferences-group bg-muted/30 p-1 rounded-lg border border-border/50">
              {/* Callout, Link */}
              {advancedTools.map((tool) => (
                <Tooltip key={tool.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={activeTool === tool.id ? "default" : "ghost"}
                      size="icon"
                      onClick={() => onToolChange(tool.id as DrawingTool)}
                      className={cn(
                        "h-8 w-8 rounded-md transition-all",
                        activeTool === tool.id
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "hover:bg-background text-muted-foreground hover:text-foreground hover:shadow-sm"
                      )}
                    >
                      <tool.icon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={8} className="bg-foreground text-background border-border/50">
                    <RichTooltip title={tool.label} description={tool.description} />
                  </TooltipContent>
                </Tooltip>
              ))}

              <div className="w-px h-4 bg-border/40 mx-1" />

              {/* Signature */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={activeTool === 'signature' ? "default" : "ghost"}
                    size="icon"
                    onClick={() => onToolChange('signature' as DrawingTool)}
                    className={cn(
                      "h-8 w-8 rounded-md transition-all",
                      activeTool === 'signature'
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "hover:bg-background text-muted-foreground hover:text-foreground hover:shadow-sm"
                    )}
                  >
                    <icons.PenTool className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8} className="bg-foreground text-background border-border/50">
                  <RichTooltip title="Signature" description="Add signature" />
                </TooltipContent>
              </Tooltip>

              {/* Stamps Dropdown */}
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant={activeTool?.startsWith('stamp') ? "default" : "ghost"}
                        size="icon"
                        className={cn(
                          "h-8 w-8 rounded-md transition-all",
                          activeTool?.startsWith('stamp')
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "hover:bg-background text-muted-foreground hover:text-foreground hover:shadow-sm"
                        )}
                      >
                        <icons.Stamp className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={8} className="bg-foreground text-background border-border/50">
                    <RichTooltip title="Stamps" description="Add status stamps" />
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent className="rounded-xl border-border/50 shadow-soft">
                  {stampTools.map((stamp) => (
                    <DropdownMenuItem
                      key={stamp.id}
                      onClick={() => onToolChange(stamp.id as DrawingTool)}
                      className="gap-2 focus:bg-primary/5 cursor-pointer"
                    >
                      <icons.Stamp className="h-4 w-4 text-primary" />
                      <span>{stamp.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="w-px h-4 bg-border/40 mx-1" />

              {/* Delete Selected */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onDelete}
                    className="h-8 w-8 rounded-md text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <icons.Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8} className="bg-foreground text-background border-border/50">
                  <RichTooltip title="Delete" description="Remove selected" />
                </TooltipContent>
              </Tooltip>
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  );
};

