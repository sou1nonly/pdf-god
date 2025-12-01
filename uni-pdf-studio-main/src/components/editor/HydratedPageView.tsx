import React, { useState, useRef, useEffect, useCallback, createContext, useContext } from 'react';
import { HydratedPage, TextBlockStyles, TextBlock as TextBlockType, ImageBlock as ImageBlockType } from '@/types/hydration';
import { FloatingToolbar } from './FloatingToolbar';
import { DrawingCanvas, DrawingTool } from './DrawingCanvas';

// Cast icons to fix TS issues
import { GripVertical, Type, Image as ImageIcon } from 'lucide-react';
const icons = { GripVertical: GripVertical as any, Type: Type as any, Image: ImageIcon as any };

// Snapping configuration - subtle snapping
const SNAP_THRESHOLD = 0.7; // Smaller threshold for subtle snapping

// Context for sharing snap guides across blocks
interface SnapGuideContextType {
  activeGuides: { type: 'h' | 'v'; position: number }[];
  setActiveGuides: (guides: { type: 'h' | 'v'; position: number }[]) => void;
  allBlocks: { id: string; box: [number, number, number, number] }[];
}

const SnapGuideContext = createContext<SnapGuideContextType>({
  activeGuides: [],
  setActiveGuides: () => {},
  allBlocks: [],
});

// Calculate snap points for a given position
function getSnapPoints(
  position: number, 
  size: number, 
  allBlocks: { id: string; box: [number, number, number, number] }[],
  currentBlockId: string,
  isHorizontal: boolean
): { snapTo: number | null; guides: { type: 'h' | 'v'; position: number }[] } {
  const guides: { type: 'h' | 'v'; position: number }[] = [];
  const guideType = isHorizontal ? 'v' : 'h';
  
  // Page snap points
  const pageSnapPoints = [0, 50, 100]; // Left/Top, Center, Right/Bottom
  
  // Element edges
  const elementStart = position;
  const elementCenter = position + size / 2;
  const elementEnd = position + size;
  
  let snapTo: number | null = null;
  
  // Check page snap points
  for (const snap of pageSnapPoints) {
    // Snap element start to page point
    if (Math.abs(elementStart - snap) < SNAP_THRESHOLD) {
      snapTo = snap;
      guides.push({ type: guideType, position: snap });
    }
    // Snap element center to page point
    else if (Math.abs(elementCenter - snap) < SNAP_THRESHOLD) {
      snapTo = snap - size / 2;
      guides.push({ type: guideType, position: snap });
    }
    // Snap element end to page point
    else if (Math.abs(elementEnd - snap) < SNAP_THRESHOLD) {
      snapTo = snap - size;
      guides.push({ type: guideType, position: snap });
    }
  }
  
  // Check other blocks for alignment
  for (const block of allBlocks) {
    if (block.id === currentBlockId) continue;
    
    const [bx, by, bw, bh] = block.box;
    const blockStart = isHorizontal ? bx : by;
    const blockSize = isHorizontal ? bw : bh;
    const blockCenter = blockStart + blockSize / 2;
    const blockEnd = blockStart + blockSize;
    
    // Snap to other block's start
    if (Math.abs(elementStart - blockStart) < SNAP_THRESHOLD) {
      snapTo = blockStart;
      guides.push({ type: guideType, position: blockStart });
    }
    // Snap to other block's center
    else if (Math.abs(elementCenter - blockCenter) < SNAP_THRESHOLD) {
      snapTo = blockCenter - size / 2;
      guides.push({ type: guideType, position: blockCenter });
    }
    // Snap to other block's end
    else if (Math.abs(elementStart - blockEnd) < SNAP_THRESHOLD) {
      snapTo = blockEnd;
      guides.push({ type: guideType, position: blockEnd });
    }
    // Snap element end to other block's start
    else if (Math.abs(elementEnd - blockStart) < SNAP_THRESHOLD) {
      snapTo = blockStart - size;
      guides.push({ type: guideType, position: blockStart });
    }
  }
  
  return { snapTo, guides };
}

interface HydratedPageWithUrl extends HydratedPage {
  backgroundUrl?: string;
}

interface HydratedPageViewProps {
  page: HydratedPageWithUrl;
  scale?: number;
  drawingTool?: DrawingTool;
  strokeColor?: string;
  strokeWidth?: number;
  fillColor?: string;
  opacity?: number;
  initialDrawingObjects?: any[]; // Fabric.js objects to load initially
  onUpdateBlock?: (blockId: string, html: string) => void;
  onMoveBlock?: (blockId: string, newBox: [number, number, number, number]) => void;
  onUpdateBlockStyles?: (blockId: string, styles: Partial<TextBlockStyles>) => void;
  onDrawingChange?: (objects: any[]) => void;
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
}

// Clean Text Block Component with proper paragraph rendering
const TextBlock: React.FC<{
  block: TextBlockType;
  scale: number;
  pageWidth: number;
  pageHeight: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdateContent: (html: string) => void;
  onResize?: (newBox: [number, number, number, number]) => void;
  onTextSelectionChange?: (hasSelection: boolean) => void;
}> = ({ block, scale, pageWidth, pageHeight, isSelected, onSelect, onUpdateContent, onResize, onTextSelectionChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [localBox, setLocalBox] = useState<[number, number, number, number]>(block.box);
  const [hasTextSelection, setHasTextSelection] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; box: [number, number, number, number] } | null>(null);
  
  // Get snap context
  const { setActiveGuides, allBlocks } = useContext(SnapGuideContext);

  // Sync local box with block.box when it changes externally
  useEffect(() => {
    setLocalBox(block.box);
  }, [block.box]);

  // Track text selection changes
  useEffect(() => {
    const checkSelection = () => {
      if (!isEditing || !elementRef.current) {
        if (hasTextSelection) {
          setHasTextSelection(false);
          onTextSelectionChange?.(false);
        }
        return;
      }
      
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const isInElement = elementRef.current.contains(range.commonAncestorContainer);
        const hasSelection = isInElement && !range.collapsed && selection.toString().length > 0;
        
        if (hasSelection !== hasTextSelection) {
          setHasTextSelection(hasSelection);
          onTextSelectionChange?.(hasSelection);
        }
      }
    };

    document.addEventListener('selectionchange', checkSelection);
    return () => document.removeEventListener('selectionchange', checkSelection);
  }, [isEditing, hasTextSelection, onTextSelectionChange]);

  const [x, y, w, h] = localBox;
  
  // Skip empty blocks
  if (!block.html || block.html.trim().length === 0) return null;

  const baseFontSize = block.styles.fontSize || 12;
  const scaledFontSize = baseFontSize * scale;
  
  const isHeader = block.meta?.isHeader || baseFontSize > 14;
  const isListItem = block.meta?.isListItem;
  
  const textDecorations: string[] = [];
  if (block.styles.underline) textDecorations.push('underline');
  if ((block.styles as any).strikethrough) textDecorations.push('line-through');
  const textDecoration = textDecorations.length > 0 ? textDecorations.join(' ') : 'none';

  // Handle mouse down for dragging with snapping
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing || !isSelected) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, box: [...localBox] as [number, number, number, number] };
    
    const handleMouseMove = (moveE: MouseEvent) => {
      if (!dragStartRef.current) return;
      const dx = ((moveE.clientX - dragStartRef.current.x) / pageWidth) * 100;
      const dy = ((moveE.clientY - dragStartRef.current.y) / pageHeight) * 100;
      let newX = Math.max(0, Math.min(100 - dragStartRef.current.box[2], dragStartRef.current.box[0] + dx));
      let newY = Math.max(0, Math.min(100 - dragStartRef.current.box[3], dragStartRef.current.box[1] + dy));
      
      // Apply snapping
      const blockW = dragStartRef.current.box[2];
      const blockH = dragStartRef.current.box[3];
      
      const hSnap = getSnapPoints(newX, blockW, allBlocks, block.id, true);
      const vSnap = getSnapPoints(newY, blockH, allBlocks, block.id, false);
      
      if (hSnap.snapTo !== null) newX = hSnap.snapTo;
      if (vSnap.snapTo !== null) newY = vSnap.snapTo;
      
      // Show guides
      setActiveGuides([...hSnap.guides, ...vSnap.guides]);
      
      setLocalBox([newX, newY, blockW, blockH]);
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      setActiveGuides([]); // Clear guides on release
      if (onResize && dragStartRef.current) {
        onResize(localBox);
      }
      dragStartRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Handle resize from corners/edges
  const handleResizeStart = (e: React.MouseEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(handle);
    dragStartRef.current = { x: e.clientX, y: e.clientY, box: [...localBox] as [number, number, number, number] };
    
    const handleMouseMove = (moveE: MouseEvent) => {
      if (!dragStartRef.current) return;
      const dx = ((moveE.clientX - dragStartRef.current.x) / pageWidth) * 100;
      const dy = ((moveE.clientY - dragStartRef.current.y) / pageHeight) * 100;
      const [origX, origY, origW, origH] = dragStartRef.current.box;
      
      let newX = origX, newY = origY, newW = origW, newH = origH;
      
      // Handle different resize directions
      if (handle.includes('e')) { newW = Math.max(5, origW + dx); }
      if (handle.includes('w')) { newX = origX + dx; newW = Math.max(5, origW - dx); }
      if (handle.includes('s')) { newH = Math.max(2, origH + dy); }
      if (handle.includes('n')) { newY = origY + dy; newH = Math.max(2, origH - dy); }
      
      // Clamp to page bounds
      newX = Math.max(0, newX);
      newY = Math.max(0, newY);
      if (newX + newW > 100) newW = 100 - newX;
      if (newY + newH > 100) newH = 100 - newY;
      
      setLocalBox([newX, newY, newW, newH]);
    };
    
    const handleMouseUp = () => {
      setIsResizing(null);
      if (onResize) {
        onResize(localBox);
      }
      dragStartRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      ref={elementRef}
      className={`
        absolute overflow-hidden
        ${isSelected ? 'ring-2 ring-blue-500 z-20' : 'hover:bg-blue-50/30 z-10'}
        ${isEditing ? 'cursor-text bg-white shadow-lg overflow-visible' : ''}
        ${isDragging ? 'cursor-move' : ''}
        ${!isEditing && !isDragging && isSelected ? 'cursor-move' : ''}
        ${!isSelected ? 'cursor-pointer' : ''}
      `}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${w}%`,
        minHeight: `${h}%`,
        fontFamily: block.styles.fontFamily || 'Inter, system-ui, sans-serif',
        fontSize: `${scaledFontSize}px`,
        fontWeight: isHeader ? 700 : (block.styles.fontWeight || 400),
        fontStyle: block.styles.italic ? 'italic' : 'normal',
        textDecoration: textDecoration,
        color: block.styles.color || '#1a1a1a',
        textAlign: (block.styles.align as any) || 'left',
        lineHeight: block.styles.lineHeight || (isHeader ? 1.2 : 1.4),
        letterSpacing: isHeader ? '-0.01em' : '0',
        padding: `${Math.max(1 * scale, 0.5)}px ${Math.max(2 * scale, 1)}px`,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        borderRadius: '2px',
        backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (!isSelected) onSelect();
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={() => {
        setIsEditing(true);
        setTimeout(() => elementRef.current?.focus(), 0);
      }}
      contentEditable={isEditing}
      suppressContentEditableWarning
      onBlur={(e) => {
        setIsEditing(false);
        onUpdateContent(e.currentTarget.innerText);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setIsEditing(false);
          elementRef.current?.blur();
        }
      }}
    >
      {isListItem ? (
        <span className="flex">
          <span className="mr-2 flex-shrink-0">{block.html.match(/^[\u2022\-\*]|\d+[\.\)]|[a-zA-Z][\.\)]/)?.[0] || '•'}</span>
          <span>{block.html.replace(/^[\u2022\-\*]\s*|\d+[\.\)]\s*|[a-zA-Z][\.\)]\s*/, '')}</span>
        </span>
      ) : block.html}
      
      {/* Resize handles - only show when selected and not editing */}
      {isSelected && !isEditing && (
        <>
          {/* Corner handles */}
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 cursor-nw-resize" onMouseDown={(e) => handleResizeStart(e, 'nw')} />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 cursor-ne-resize" onMouseDown={(e) => handleResizeStart(e, 'ne')} />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 cursor-sw-resize" onMouseDown={(e) => handleResizeStart(e, 'sw')} />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 cursor-se-resize" onMouseDown={(e) => handleResizeStart(e, 'se')} />
          {/* Edge handles */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-1.5 bg-blue-500 cursor-n-resize" onMouseDown={(e) => handleResizeStart(e, 'n')} />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1.5 bg-blue-500 cursor-s-resize" onMouseDown={(e) => handleResizeStart(e, 's')} />
          <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-1.5 h-4 bg-blue-500 cursor-w-resize" onMouseDown={(e) => handleResizeStart(e, 'w')} />
          <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-1.5 h-4 bg-blue-500 cursor-e-resize" onMouseDown={(e) => handleResizeStart(e, 'e')} />
        </>
      )}
    </div>
  );
};

// Image Block Component
const ImageBlockView: React.FC<{
  block: ImageBlockType;
  scale: number;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ block, scale, isSelected, onSelect }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  const [x, y, w, h] = block.box;

  // Convert blob to URL
  useEffect(() => {
    if (block.blob && block.blob.size > 0) {
      const url = URL.createObjectURL(block.blob);
      setImageUrl(url);
      setLoadError(false);
      return () => URL.revokeObjectURL(url);
    } else {
      setLoadError(true);
    }
  }, [block.blob]);

  return (
    <div
      className={`
        absolute transition-all duration-150 overflow-hidden
        ${isSelected ? 'ring-2 ring-blue-500 z-20' : 'hover:ring-2 hover:ring-blue-300 z-10'}
      `}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${w}%`,
        height: `${h}%`,
        borderRadius: '4px',
        backgroundColor: '#f3f4f6',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {imageUrl && !loadError ? (
        <img 
          src={imageUrl} 
          alt="PDF Image"
          className="w-full h-full object-contain"
          style={{
            transform: `rotate(${block.rotation || 0}deg)`,
          }}
          onError={() => setLoadError(true)}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-100">
          <icons.Image size={24} className="mb-1" />
          <span className="text-xs">Image</span>
        </div>
      )}
      
      {/* Selection handles */}
      {isSelected && (
        <>
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-nw-resize" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-ne-resize" />
          <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-sw-resize" />
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-se-resize" />
        </>
      )}
    </div>
  );
};

export const HydratedPageView: React.FC<HydratedPageViewProps> = ({ 
  page, 
  scale = 1.0,
  drawingTool = 'select',
  strokeColor = '#000000',
  strokeWidth = 2,
  fillColor = 'transparent',
  opacity = 1,
  initialDrawingObjects,
  onUpdateBlock,
  onMoveBlock,
  onUpdateBlockStyles,
  onDrawingChange,
  onHistoryChange
}) => {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [blockWithTextSelection, setBlockWithTextSelection] = useState<string | null>(null);
  const [activeGuides, setActiveGuides] = useState<{ type: 'h' | 'v'; position: number }[]>([]);
  const pageRef = useRef<HTMLDivElement>(null);
  
  // Is drawing mode active (any tool except select)
  const isDrawingMode = drawingTool !== 'select';
  
  // Find selected block for toolbar - only show if text is selected inside
  const selectedBlock = blockWithTextSelection 
    ? page.blocks.find(b => b.id === blockWithTextSelection && b.type === 'text') as TextBlockType | undefined
    : undefined;

  // A4 dimensions at 72 DPI = 595 x 842 points
  const pageWidth = page.dims.width * scale;
  const pageHeight = page.dims.height * scale;
  
  // Prepare all blocks for snapping reference
  const allBlocks = page.blocks.map(b => ({ id: b.id, box: b.box }));
  
  // Deselect when switching to drawing mode
  useEffect(() => {
    if (isDrawingMode) {
      setSelectedBlockId(null);
    }
  }, [isDrawingMode]);

  return (
    <SnapGuideContext.Provider value={{ activeGuides, setActiveGuides, allBlocks }}>
      <div className="relative" style={{ width: pageWidth }}>
        {/* Floating Toolbar - positioned above selected block */}
        {selectedBlock && (
          <div 
            className="absolute z-50"
            style={{
              top: `${(selectedBlock.box[1] / 100) * pageHeight - 50}px`,
              left: `${((selectedBlock.box[0] + selectedBlock.box[2] / 2) / 100) * pageWidth}px`,
              transform: 'translateX(-50%)',
            }}
          >
            <FloatingToolbar 
              styles={selectedBlock.styles}
              onUpdate={(styles) => onUpdateBlockStyles?.(selectedBlock.id, styles)}
              position={{ top: 0, left: 0, width: 0 }} // Position handled by parent
            />
          </div>
        )}

        {/* A4 Page Canvas */}
        <div 
          ref={pageRef}
          className="relative bg-white shadow-2xl mx-auto overflow-hidden"
          style={{
            width: pageWidth,
            height: pageHeight,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          }}
          onClick={() => setSelectedBlockId(null)}
        >
          {/* Clean White Background */}
          <div className="absolute inset-0 bg-white" />

          {/* Snap Guide Lines - invisible, just for haptic feedback */}
          {/* Guides are now invisible - snapping still works but no visual lines */}

          {/* Page Content - Text Blocks */}
          <div>
            {page.blocks.map((block) => {
              if (block.type === 'text') {
                return (
                  <TextBlock
                    key={block.id}
                    block={block}
                    scale={scale}
                    pageWidth={pageWidth}
                    pageHeight={pageHeight}
                    isSelected={selectedBlockId === block.id}
                    onSelect={() => !isDrawingMode && setSelectedBlockId(block.id)}
                    onUpdateContent={(html) => onUpdateBlock?.(block.id, html)}
                    onResize={(newBox) => onMoveBlock?.(block.id, newBox)}
                    onTextSelectionChange={(hasSelection) => {
                      setBlockWithTextSelection(hasSelection ? block.id : null);
                    }}
                  />
                );
              }
              
              if (block.type === 'image') {
                return (
                  <ImageBlockView
                    key={block.id}
                    block={block as ImageBlockType}
                    scale={scale}
                    isSelected={selectedBlockId === block.id}
                    onSelect={() => !isDrawingMode && setSelectedBlockId(block.id)}
                  />
                );
              }
              
              return null;
            })}
          </div>

          {/* Drawing Canvas Overlay - Always mounted and active */}
          <DrawingCanvas
            width={page.dims.width}
            height={page.dims.height}
            scale={scale}
            activeTool={drawingTool}
            strokeColor={strokeColor}
            strokeWidth={strokeWidth}
            fillColor={fillColor}
            opacity={opacity}
            initialObjects={initialDrawingObjects}
            onToolChange={() => {}} // Tool change handled by parent
            onObjectsChange={onDrawingChange}
            onHistoryChange={onHistoryChange}
            isActive={true}
          />

          {/* Page Number */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-gray-300 pointer-events-none">
            Page {page.pageIndex + 1}
          </div>
        </div>
      </div>
    </SnapGuideContext.Provider>
  );
};