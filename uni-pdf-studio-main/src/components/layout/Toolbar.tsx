import { 
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Undo2,
  Redo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

const AnySlider = Slider as unknown as React.ComponentType<any>;

// Cast icons to fix TS version mismatch
const icons = {
  ChevronLeft: ChevronLeft as any,
  ChevronRight: ChevronRight as any,
  RotateCw: RotateCw as any,
  Undo2: Undo2 as any,
  Redo2: Redo2 as any,
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
}: ToolbarProps) => {
  const handlePageSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem('page') as HTMLInputElement;
    const page = parseInt(input.value);
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  return (
    <div className="h-12 border-b bg-card flex items-center px-3 gap-2 shrink-0">
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

      <div className="w-px h-6 bg-border" />

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
          <span className="text-xs text-muted-foreground">/ {totalPages}</span>
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
          <div className="w-px h-6 bg-border" />
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground w-8">{zoom}%</span>
            <AnySlider
              value={[zoom]}
              onValueChange={([val]: number[]) => onZoomChange(val)}
              min={25}
              max={300}
              step={5}
              className="w-32"
            />
          </div>
        </>
      )}

      <div className="w-px h-6 bg-border" />

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
    </div>
  );
};
