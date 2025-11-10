import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Type,
  Highlighter,
  Underline,
  Strikethrough,
  Stamp,
  Pencil,
  Square,
  Circle,
  Minus,
  Eraser,
  Image as ImageIcon,
  Undo,
  Redo,
  Bold,
  Italic,
  MousePointer2,
} from "lucide-react";
import { Input } from "@/components/ui/input";

export type EditorTool = 
  | 'select'
  | 'text'
  | 'highlight'
  | 'underline'
  | 'strikethrough'
  | 'stamp'
  | 'draw'
  | 'rectangle'
  | 'circle'
  | 'arrow'
  | 'line'
  | 'eraser'
  | 'image';

export interface EditorToolbarProps {
  activeTool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  fontFamily: string;
  onFontFamilyChange: (family: string) => void;
  textColor: string;
  onTextColorChange: (color: string) => void;
  isBold: boolean;
  isItalic: boolean;
  onToggleBold: () => void;
  onToggleItalic: () => void;
  strokeWidth: number;
  onStrokeWidthChange: (width: number) => void;
  strokeColor: string;
  onStrokeColorChange: (color: string) => void;
  highlightColor: string;
  onHighlightColorChange: (color: string) => void;
  highlightMode: 'rectangle' | 'pen';
  onHighlightModeChange: (mode: 'rectangle' | 'pen') => void;
  stampText: string;
  onStampTextChange: (text: string) => void;
  stampColor: string;
  onStampColorChange: (color: string) => void;
  fillColor: string;
  onFillColorChange: (color: string) => void;
  fillOpacity: number;
  onFillOpacityChange: (opacity: number) => void;
  selectedObjectType?: string | null;
}

export const EditorToolbar = ({
  activeTool,
  onToolChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  fontSize,
  onFontSizeChange,
  fontFamily,
  onFontFamilyChange,
  textColor,
  onTextColorChange,
  isBold,
  isItalic,
  onToggleBold,
  onToggleItalic,
  strokeWidth,
  onStrokeWidthChange,
  strokeColor,
  onStrokeColorChange,
  highlightColor,
  onHighlightColorChange,
  highlightMode,
  onHighlightModeChange,
  stampText,
  onStampTextChange,
  stampColor,
  onStampColorChange,
  fillColor,
  onFillColorChange,
  fillOpacity,
  onFillOpacityChange,
  selectedObjectType,
}: EditorToolbarProps) => {
  const ToolButton = ({ 
    tool, 
    icon: Icon, 
    label 
  }: { 
    tool: EditorTool; 
    icon: any; 
    label: string 
  }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={activeTool === tool ? "default" : "ghost"}
            size="icon"
            onClick={() => onToolChange(tool)}
          >
            <Icon className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const isTextTool = activeTool === 'text' || selectedObjectType === 'i-text';
  const isDrawingTool = ['draw', 'rectangle', 'circle', 'arrow', 'line'].includes(activeTool) || 
                        ['rect', 'circle', 'line', 'path'].includes(selectedObjectType || '');
  const isShapeTool = ['rectangle', 'circle'].includes(activeTool) || 
                      ['rect', 'circle'].includes(selectedObjectType || '');
  const isHighlightTool = activeTool === 'highlight';
  const isStampTool = activeTool === 'stamp';
  const isEraserTool = activeTool === 'eraser';

  return (
    <div className="border-b bg-card p-2">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Undo/Redo */}
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onUndo}
                  disabled={!canUndo}
                >
                  <Undo className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Undo (Ctrl+Z)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onRedo}
                  disabled={!canRedo}
                >
                  <Redo className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Redo (Ctrl+Y)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <Separator orientation="vertical" className="h-8" />

        {/* Selection Tool */}
        <ToolButton tool="select" icon={MousePointer2} label="Select (Move/Resize)" />

        <Separator orientation="vertical" className="h-8" />

        {/* Text Tools */}
        <ToolButton tool="text" icon={Type} label="Text" />

        {isTextTool && (
          <>
            {selectedObjectType === 'i-text' && (
              <span className="text-xs text-muted-foreground px-2">
                Editing Text
              </span>
            )}
            
            <Select value={fontFamily} onValueChange={onFontFamilyChange}>
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Arial">Arial</SelectItem>
                <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                <SelectItem value="Courier New">Courier New</SelectItem>
                <SelectItem value="Georgia">Georgia</SelectItem>
                <SelectItem value="Verdana">Verdana</SelectItem>
                <SelectItem value="Helvetica">Helvetica</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="number"
              value={fontSize}
              onChange={(e) => onFontSizeChange(Number(e.target.value))}
              className="w-16 h-8"
              min={8}
              max={72}
            />

            <Button
              variant={isBold ? "default" : "ghost"}
              size="icon"
              onClick={onToggleBold}
              className="h-8 w-8"
            >
              <Bold className="h-4 w-4" />
            </Button>

            <Button
              variant={isItalic ? "default" : "ghost"}
              size="icon"
              onClick={onToggleItalic}
              className="h-8 w-8"
            >
              <Italic className="h-4 w-4" />
            </Button>

            <Input
              type="color"
              value={textColor}
              onChange={(e) => onTextColorChange(e.target.value)}
              className="w-12 h-8 p-1 cursor-pointer"
              title="Text Color"
            />
          </>
        )}

        <Separator orientation="vertical" className="h-8" />

        {/* Annotation Tools */}
        <ToolButton tool="highlight" icon={Highlighter} label="Highlight" />
        
        {isHighlightTool && (
          <>
            <Select value={highlightMode} onValueChange={onHighlightModeChange}>
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rectangle">Rectangle</SelectItem>
                <SelectItem value="pen">Pen</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="color"
              value={highlightColor}
              onChange={(e) => onHighlightColorChange(e.target.value)}
              className="w-12 h-8"
              title="Highlight Color"
            />

            {highlightMode === 'pen' && (
              <Input
                type="number"
                value={strokeWidth}
                onChange={(e) => onStrokeWidthChange(Number(e.target.value))}
                className="w-16 h-8"
                min={5}
                max={40}
                title="Pen Width"
              />
            )}
            
            <Separator orientation="vertical" className="h-8" />
          </>
        )}
        
        <ToolButton tool="underline" icon={Underline} label="Underline" />
        <ToolButton tool="strikethrough" icon={Strikethrough} label="Strikethrough" />
        <ToolButton tool="stamp" icon={Stamp} label="Stamp" />
        
        {isStampTool && (
          <>
            <Select value={stampText} onValueChange={onStampTextChange}>
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="APPROVED">APPROVED</SelectItem>
                <SelectItem value="DRAFT">DRAFT</SelectItem>
                <SelectItem value="CONFIDENTIAL">CONFIDENTIAL</SelectItem>
                <SelectItem value="URGENT">URGENT</SelectItem>
                <SelectItem value="REVIEWED">REVIEWED</SelectItem>
                <SelectItem value="FINAL">FINAL</SelectItem>
                <SelectItem value="COPY">COPY</SelectItem>
                <SelectItem value="VOID">VOID</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="color"
              value={stampColor}
              onChange={(e) => onStampColorChange(e.target.value)}
              className="w-12 h-8"
              title="Stamp Color"
            />
            
            <Separator orientation="vertical" className="h-8" />
          </>
        )}

        <Separator orientation="vertical" className="h-8" />

        {/* Drawing Tools */}
        <ToolButton tool="draw" icon={Pencil} label="Draw" />
        <ToolButton tool="rectangle" icon={Square} label="Rectangle" />
        <ToolButton tool="circle" icon={Circle} label="Circle" />
        <ToolButton tool="line" icon={Minus} label="Line" />
        <ToolButton tool="eraser" icon={Eraser} label="Eraser" />

        {isDrawingTool && (
          <>
            {selectedObjectType && (
              <span className="text-xs text-muted-foreground px-2">
                Editing {selectedObjectType === 'rect' ? 'Rectangle' : 
                        selectedObjectType === 'circle' ? 'Circle' : 
                        selectedObjectType === 'line' ? 'Line' : 
                        selectedObjectType === 'path' ? 'Drawing' : 'Object'}
              </span>
            )}
            
            <Input
              type="number"
              value={strokeWidth}
              onChange={(e) => onStrokeWidthChange(Number(e.target.value))}
              className="w-16 h-8"
              min={1}
              max={20}
              title="Stroke Width"
            />

            <Input
              type="color"
              value={strokeColor}
              onChange={(e) => onStrokeColorChange(e.target.value)}
              className="w-12 h-8 p-1 cursor-pointer"
              title="Stroke Color"
            />
            
            {isShapeTool && (
              <>
                <Input
                  type="color"
                  value={fillColor}
                  onChange={(e) => onFillColorChange(e.target.value)}
                  className="w-12 h-8 p-1 cursor-pointer"
                  title="Fill Color"
                />
                
                <Input
                  type="range"
                  value={fillOpacity}
                  onChange={(e) => onFillOpacityChange(Number(e.target.value))}
                  className="w-24 h-8"
                  min={0}
                  max={100}
                  title={`Fill Opacity: ${fillOpacity}%`}
                />
                
                <span className="text-xs text-muted-foreground">{fillOpacity}%</span>
              </>
            )}
          </>
        )}

        <Separator orientation="vertical" className="h-8" />

        {/* Image Tool */}
        <ToolButton tool="image" icon={ImageIcon} label="Insert Image" />
      </div>
    </div>
  );
};
