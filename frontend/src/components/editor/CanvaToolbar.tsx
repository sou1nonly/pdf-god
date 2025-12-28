import React, { useState } from 'react';
import {
  Undo2, Redo2, MousePointer2, Type, Pencil, Square,
  Highlighter, StickyNote, Download, Trash2, Minus,
  Circle, ArrowRight, Eraser, Check, X, Waves, ImageIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DrawingTool } from './types';
import { RichTooltip } from "@/components/ui/tooltip-helpers";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Cast icons to fix TS version issues
const icons = {
  Undo2: Undo2 as any,
  Redo2: Redo2 as any,
  MousePointer2: MousePointer2 as any,
  Type: Type as any,
  Pencil: Pencil as any,
  Square: Square as any,
  Circle: Circle as any,
  Minus: Minus as any,
  ArrowRight: ArrowRight as any,
  Highlighter: Highlighter as any,
  StickyNote: StickyNote as any,
  Download: Download as any,
  Trash2: Trash2 as any,
  Eraser: Eraser as any,
  Check: Check as any,
  X: X as any,
  Waves: Waves as any,
  ImageIcon: ImageIcon as any,
};

interface CanvaToolbarProps {
  activeTool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  onExport: () => void;
}

type ToolItem = {
  id: DrawingTool;
  icon: any;
  label: string;
  shortcut?: string;
  description: string;
};

export const CanvaToolbar: React.FC<CanvaToolbarProps> = ({
  activeTool,
  onToolChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onDelete,
  onExport,
}) => {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const primaryTools: ToolItem[] = [
    { id: 'select', icon: icons.MousePointer2, label: 'Select', shortcut: 'V', description: 'Select and move objects' },
    { id: 'text', icon: icons.Type, label: 'Text', shortcut: 'T', description: 'Add text to document' },
    { id: 'image', icon: icons.ImageIcon, label: 'Image', shortcut: 'I', description: 'Upload and place images' },
    { id: 'draw', icon: icons.Pencil, label: 'Draw', shortcut: 'P', description: 'Freehand drawing' },
    { id: 'highlight', icon: icons.Highlighter, label: 'Highlight', shortcut: 'H', description: 'Highlight text areas' },
    { id: 'eraser', icon: icons.Eraser, label: 'Eraser', shortcut: 'E', description: 'Erase objects' },
    { id: 'note', icon: icons.StickyNote, label: 'Note', shortcut: 'N', description: 'Add sticky note' },
  ];

  const shapeTools: ToolItem[] = [
    { id: 'rect', icon: icons.Square, label: 'Rectangle', description: 'Draw a rectangle' },
    { id: 'circle', icon: icons.Circle, label: 'Circle', description: 'Draw a circle' },
    { id: 'line', icon: icons.Minus, label: 'Line', description: 'Draw a straight line' },
    { id: 'arrow', icon: icons.ArrowRight, label: 'Arrow', description: 'Draw an arrow' },
  ];

  const markTools: ToolItem[] = [
    { id: 'squiggly', icon: icons.Waves, label: 'Squiggly', description: 'Draw a wave line' },
    { id: 'check', icon: icons.Check, label: 'Check', description: 'Add check mark' },
    { id: 'cross', icon: icons.X, label: 'Cross', description: 'Add cross mark' },
  ];

  const isShapeTool = ['rect', 'circle', 'line', 'arrow'].includes(activeTool);
  const isMarkTool = ['squiggly', 'check', 'cross'].includes(activeTool);

  return (
    <TooltipProvider delayDuration={1000}>
      <div className="fixed left-4 top-1/2 -translate-y-1/2 z-[100] flex flex-col gap-2">
        {/* Main Tools Panel */}
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl ring-1 ring-black/5 border border-border p-2 flex flex-col gap-1">
          {/* Primary Tools */}
          {primaryTools.map((tool) => (
            <Tooltip key={tool.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onToolChange(tool.id)}
                  className={cn(
                    "p-3 rounded-xl transition-all duration-200 group relative border",
                    activeTool === tool.id
                      ? "bg-primary text-primary-foreground shadow-md border-primary"
                      : "bg-white border-gray-200 shadow-sm text-gray-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 hover:shadow-md"
                  )}
                >
                  <tool.icon size={20} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={16} className="bg-foreground text-background border-border/50">
                <RichTooltip title={tool.label} shortcut={tool.shortcut} description={tool.description} />
              </TooltipContent>
            </Tooltip>
          ))}

          {/* Shapes submenu */}
          <div className="relative">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setExpandedGroup(expandedGroup === 'shapes' ? null : 'shapes')}
                  className={cn(
                    "p-3 rounded-xl transition-all duration-200 group relative w-full",
                    isShapeTool
                      ? "bg-pastel-blue text-blue-900 shadow-sm"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <icons.Square size={20} />
                  <span className="absolute bottom-1 right-1 w-1.5 h-1.5 bg-current opacity-50 rounded-full" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={16} className="bg-foreground text-background border-border/50">
                <RichTooltip title="Shapes" shortcut="S" description="Insert geometric shapes" />
              </TooltipContent>
            </Tooltip>

            {/* Shape submenu */}
            {expandedGroup === 'shapes' && (
              <div className="absolute left-full ml-2 top-0 bg-white/90 backdrop-blur-md rounded-xl shadow-soft border border-white/20 p-2 flex flex-col gap-1 min-w-[120px]">
                {shapeTools.map((shape) => (
                  <button
                    key={shape.id}
                    onClick={() => {
                      onToolChange(shape.id);
                      setExpandedGroup(null);
                    }}
                    className={cn(
                      "p-2 rounded-lg transition-colors flex items-center gap-2",
                      activeTool === shape.id
                        ? "bg-pastel-blue text-blue-900 shadow-sm"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <shape.icon size={16} />
                    <span className="text-sm">{shape.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Marks submenu */}
          <div className="relative">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setExpandedGroup(expandedGroup === 'marks' ? null : 'marks')}
                  className={cn(
                    "p-3 rounded-xl transition-all duration-200 group relative w-full",
                    isMarkTool
                      ? "bg-pastel-green text-green-900 shadow-sm"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <icons.Check size={20} />
                  <span className="absolute bottom-1 right-1 w-1.5 h-1.5 bg-current opacity-50 rounded-full" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={16} className="bg-foreground text-background border-border/50">
                <RichTooltip title="Marks" description="Add symbols and marks" />
              </TooltipContent>
            </Tooltip>

            {/* Marks submenu */}
            {expandedGroup === 'marks' && (
              <div className="absolute left-full ml-2 top-0 bg-white/90 backdrop-blur-md rounded-xl shadow-soft border border-white/20 p-2 flex flex-col gap-1 min-w-[120px]">
                {markTools.map((mark) => (
                  <button
                    key={mark.id}
                    onClick={() => {
                      onToolChange(mark.id);
                      setExpandedGroup(null);
                    }}
                    className={cn(
                      "p-2 rounded-lg transition-colors flex items-center gap-2",
                      activeTool === mark.id
                        ? "bg-pastel-green text-green-900 shadow-sm"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <mark.icon size={16} />
                    <span className="text-sm">{mark.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions Panel */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-soft border border-white/20 p-2 flex flex-col gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onExport}
                className="p-3 rounded-xl hover:bg-pastel-green/50 text-green-700 transition-all duration-200 group relative"
              >
                <icons.Download size={20} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={16} className="bg-foreground text-background border-border/50">
              <RichTooltip title="Export PDF" description="Download document" />
            </TooltipContent>
          </Tooltip>

          {onDelete && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onDelete}
                  className="p-3 rounded-xl hover:bg-destructive/10 text-destructive/70 hover:text-destructive transition-all duration-200 group relative"
                >
                  <icons.Trash2 size={20} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={16} className="bg-foreground text-background border-border/50">
                <RichTooltip title="Delete" description="Remove selected" />
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};
