import React, { useState } from 'react';
import {
  Undo2, Redo2, MousePointer2, Type, Pencil, Square,
  Highlighter, StickyNote, Download, Trash2, Minus,
  Circle, ArrowRight, Eraser, Check, X, Waves
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DrawingTool } from './DrawingCanvas';

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
};

interface CanvaToolbarProps {
  activeTool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClearAll: () => void;
  onExport: () => void;
}

type ToolItem = {
  id: DrawingTool;
  icon: any;
  label: string;
  shortcut?: string;
};

export const CanvaToolbar: React.FC<CanvaToolbarProps> = ({
  activeTool,
  onToolChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClearAll,
  onExport,
}) => {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const primaryTools: ToolItem[] = [
    { id: 'select', icon: icons.MousePointer2, label: 'Select', shortcut: 'V' },
    { id: 'text', icon: icons.Type, label: 'Text', shortcut: 'T' },
    { id: 'draw', icon: icons.Pencil, label: 'Draw', shortcut: 'P' },
    { id: 'highlight', icon: icons.Highlighter, label: 'Highlight', shortcut: 'H' },
    { id: 'eraser', icon: icons.Eraser, label: 'Eraser', shortcut: 'E' },
    { id: 'note', icon: icons.StickyNote, label: 'Note', shortcut: 'N' },
  ];

  const shapeTools: ToolItem[] = [
    { id: 'rect', icon: icons.Square, label: 'Rectangle' },
    { id: 'circle', icon: icons.Circle, label: 'Circle' },
    { id: 'line', icon: icons.Minus, label: 'Line' },
    { id: 'arrow', icon: icons.ArrowRight, label: 'Arrow' },
  ];

  const markTools: ToolItem[] = [
    { id: 'squiggly', icon: icons.Waves, label: 'Squiggly' },
    { id: 'check', icon: icons.Check, label: 'Check' },
    { id: 'cross', icon: icons.X, label: 'Cross' },
  ];

  const isShapeTool = ['rect', 'circle', 'line', 'arrow'].includes(activeTool);
  const isMarkTool = ['squiggly', 'check', 'cross'].includes(activeTool);

  return (
    <div className="fixed left-4 top-1/2 -translate-y-1/2 z-[100] flex flex-col gap-2">
      {/* Main Tools Panel */}
      <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl ring-1 ring-black/5 border border-border p-2 flex flex-col gap-1">
        {/* Undo/Redo */}
        <div className="flex flex-col gap-1 pb-2 mb-2 border-b border-border/50">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={cn(
              "p-3 rounded-xl transition-all duration-200 group relative border",
              canUndo
                ? "bg-white border-gray-200 shadow-sm hover:border-primary/50 hover:bg-blue-50 hover:text-primary hover:shadow-md text-foreground/80 cursor-pointer"
                : "bg-gray-50 border-transparent text-muted-foreground/30 cursor-not-allowed"
            )}
            title="Undo (Ctrl+Z)"
          >
            <icons.Undo2 size={20} />
            <span className="absolute left-full ml-3 px-2 py-1 bg-foreground/80 text-background text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 backdrop-blur-sm">
              Undo <span className="opacity-70">Ctrl+Z</span>
            </span>
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={cn(
              "p-3 rounded-xl transition-all duration-200 group relative border",
              canRedo
                ? "bg-white border-gray-200 shadow-sm hover:border-primary/50 hover:bg-blue-50 hover:text-primary hover:shadow-md text-foreground/80 cursor-pointer"
                : "bg-gray-50 border-transparent text-muted-foreground/30 cursor-not-allowed"
            )}
            title="Redo (Ctrl+Y)"
          >
            <icons.Redo2 size={20} />
            <span className="absolute left-full ml-3 px-2 py-1 bg-foreground/80 text-background text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 backdrop-blur-sm">
              Redo <span className="opacity-70">Ctrl+Y</span>
            </span>
          </button>
        </div>

        {/* Primary Tools */}
        {primaryTools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            className={cn(
              "p-3 rounded-xl transition-all duration-200 group relative border",
              activeTool === tool.id
                ? "bg-primary text-primary-foreground shadow-md border-primary"
                : "bg-white border-gray-200 shadow-sm text-gray-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 hover:shadow-md"
            )}
            title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
          >
            <tool.icon size={20} />
            <span className="absolute left-full ml-3 px-2 py-1 bg-foreground/80 text-background text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 backdrop-blur-sm">
              {tool.label}
              {tool.shortcut && <span className="ml-2 opacity-70">{tool.shortcut}</span>}
            </span>
          </button>
        ))}

        {/* Shapes submenu */}
        <div className="relative">
          <button
            onClick={() => setExpandedGroup(expandedGroup === 'shapes' ? null : 'shapes')}
            className={cn(
              "p-3 rounded-xl transition-all duration-200 group relative w-full",
              isShapeTool
                ? "bg-pastel-blue text-blue-900 shadow-sm"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
            title="Shapes"
          >
            <icons.Square size={20} />
            <span className="absolute bottom-1 right-1 w-1.5 h-1.5 bg-current opacity-50 rounded-full" />
            <span className="absolute left-full ml-3 px-2 py-1 bg-foreground/80 text-background text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 backdrop-blur-sm">
              Shapes <span className="opacity-70">S</span>
            </span>
          </button>

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
          <button
            onClick={() => setExpandedGroup(expandedGroup === 'marks' ? null : 'marks')}
            className={cn(
              "p-3 rounded-xl transition-all duration-200 group relative w-full",
              isMarkTool
                ? "bg-pastel-green text-green-900 shadow-sm"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
            title="Marks"
          >
            <icons.Check size={20} />
            <span className="absolute bottom-1 right-1 w-1.5 h-1.5 bg-current opacity-50 rounded-full" />
            <span className="absolute left-full ml-3 px-2 py-1 bg-foreground/80 text-background text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 backdrop-blur-sm">
              Marks
            </span>
          </button>

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
        <button
          onClick={onExport}
          className="p-3 rounded-xl hover:bg-pastel-green/50 text-green-700 transition-all duration-200 group relative"
          title="Export PDF"
        >
          <icons.Download size={20} />
          <span className="absolute left-full ml-3 px-2 py-1 bg-foreground/80 text-background text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 backdrop-blur-sm">
            Export PDF
          </span>
        </button>
        <button
          onClick={onClearAll}
          className="p-3 rounded-xl hover:bg-red-50 text-destructive/80 transition-all duration-200 group relative"
          title="Clear All"
        >
          <icons.Trash2 size={20} />
          <span className="absolute left-full ml-3 px-2 py-1 bg-foreground/80 text-background text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 backdrop-blur-sm">
            Clear All
          </span>
        </button>
      </div>
    </div>
  );
};

// Color Panel Component - Horizontal layout for bottom placement
interface ColorPanelProps {
  strokeColor: string;
  onStrokeColorChange: (color: string) => void;
  fillColor: string;
  onFillColorChange: (color: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (width: number) => void;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
}

export const ColorPanel: React.FC<ColorPanelProps> = ({
  strokeColor,
  onStrokeColorChange,
  fillColor,
  onFillColorChange,
  strokeWidth,
  onStrokeWidthChange,
  opacity,
  onOpacityChange,
}) => {
  const presetColors = [
    '#000000', '#ef4444', '#f97316', '#f59e0b', '#22c55e',
    '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b',
  ];

  return (
    <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl ring-1 ring-black/5 border border-border px-4 py-3 flex items-center gap-4">
      {/* Stroke color */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 font-medium">Stroke</span>
        <div className="flex items-center gap-1">
          {presetColors.map(color => (
            <button
              key={color}
              className={cn(
                "w-6 h-6 rounded-md border-2 transition-transform hover:scale-110",
                strokeColor === color
                  ? "border-blue-500 ring-2 ring-blue-200"
                  : "border-gray-200"
              )}
              style={{ backgroundColor: color }}
              onClick={() => onStrokeColorChange(color)}
            />
          ))}
          <input
            type="color"
            value={strokeColor}
            onChange={(e) => onStrokeColorChange(e.target.value)}
            className="w-6 h-6 rounded cursor-pointer"
          />
        </div>
      </div>

      <div className="w-px h-8 bg-gray-200" />

      {/* Fill color */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 font-medium">Fill</span>
        <div className="flex items-center gap-1">
          <button
            className={cn(
              "w-6 h-6 rounded-md border-2 transition-transform hover:scale-110 flex items-center justify-center",
              fillColor === 'transparent'
                ? "border-blue-500 ring-2 ring-blue-200"
                : "border-gray-200"
            )}
            style={{
              background: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
              backgroundSize: '8px 8px',
              backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px'
            }}
            onClick={() => onFillColorChange('transparent')}
            title="No fill"
          >
            <icons.Minus size={10} className="text-gray-400" />
          </button>
          {presetColors.slice(0, 6).map(color => (
            <button
              key={`fill-${color}`}
              className={cn(
                "w-6 h-6 rounded-md border-2 transition-transform hover:scale-110",
                fillColor === color
                  ? "border-blue-500 ring-2 ring-blue-200"
                  : "border-gray-200"
              )}
              style={{ backgroundColor: color }}
              onClick={() => onFillColorChange(color)}
            />
          ))}
        </div>
      </div>

      <div className="w-px h-8 bg-gray-200" />

      {/* Stroke width */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 font-medium">Size</span>
        <input
          type="range"
          min="1"
          max="20"
          value={strokeWidth}
          onChange={(e) => onStrokeWidthChange(Number(e.target.value))}
          className="w-20 accent-blue-500"
        />
        <span className="text-xs font-medium text-gray-700 w-8">{strokeWidth}px</span>
      </div>

      <div className="w-px h-8 bg-gray-200" />

      {/* Opacity */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 font-medium">Opacity</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={opacity}
          onChange={(e) => onOpacityChange(Number(e.target.value))}
          className="w-16 accent-blue-500"
        />
        <span className="text-xs font-medium text-gray-700 w-8">{Math.round(opacity * 100)}%</span>
      </div>
    </div>
  );
};

export default CanvaToolbar;
