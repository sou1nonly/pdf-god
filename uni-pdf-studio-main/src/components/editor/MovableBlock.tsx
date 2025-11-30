import React, { useState, useEffect, useRef } from 'react';
import { TextBlock, ImageBlock, TableBlock } from '@/types/hydration';

interface MovableBlockProps {
  block: TextBlock | ImageBlock | TableBlock;
  scale: number;
  pageDims: { width: number; height: number };
  onUpdateContent?: (html: string) => void;
  onMove?: (newBox: [number, number, number, number]) => void;
  isSelected?: boolean;
  onSelect?: () => void;
}

export const MovableBlock: React.FC<MovableBlockProps> = ({
  block,
  scale,
  pageDims,
  onUpdateContent,
  onMove,
  isSelected,
  onSelect
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  
  // Local state for smooth dragging without waiting for parent updates
  const [localBox, setLocalBox] = useState(block.box);

  // Sync local box when prop changes (unless dragging)
  useEffect(() => {
    if (!isDragging) {
      setLocalBox(block.box);
    }
  }, [block.box, isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return; // Don't drag if editing text
    
    e.stopPropagation(); // Prevent page selection
    onSelect?.(); // Select this block

    const startX = e.clientX;
    const startY = e.clientY;
    const [origX, origY, w, h] = localBox;

    setIsDragging(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      // Convert pixel delta to percentage delta
      // pageDims is in PDF points (or whatever unit), but the container is scaled.
      // Wait, pageDims is the raw PDF size. The container size is pageDims * scale.
      // So 100% = pageDims.width * scale pixels.
      
      const containerWidthPx = pageDims.width * scale;
      const containerHeightPx = pageDims.height * scale;

      const dxPercent = (dx / containerWidthPx) * 100;
      const dyPercent = (dy / containerHeightPx) * 100;

      let newX = origX + dxPercent;
      let newY = origY + dyPercent;

      // Snap to grid (0.5%)
      const SNAP = 0.5;
      newX = Math.round(newX / SNAP) * SNAP;
      newY = Math.round(newY / SNAP) * SNAP;

      // Clamp to page boundaries
      newX = Math.max(0, Math.min(newX, 100 - w));
      newY = Math.max(0, Math.min(newY, 100 - h));

      setLocalBox([newX, newY, w, h]);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // Commit the move
      // We need to access the *current* localBox state here.
      // Since we are in a closure, we might have stale state if we used localBox directly.
      // But we updated it via setLocalBox. 
      // Actually, the best way is to calculate the final pos from the last event or use a ref for the current box.
      // Let's just use the value from the last render cycle which might be slightly off if React batches?
      // Better: use a ref to track current box during drag.
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // We need a ref to track the latest box for the mouseup handler
  const latestBoxRef = useRef(localBox);
  useEffect(() => { latestBoxRef.current = localBox; }, [localBox]);

  // Re-implement mouseup to use the ref
  useEffect(() => {
    if (!isDragging) {
      // If we just stopped dragging, commit the change
      if (latestBoxRef.current !== block.box) {
        onMove?.(latestBoxRef.current);
      }
    }
  }, [isDragging]);


  const [x, y, w, h] = localBox;

  // Styles
  const commonStyle: React.CSSProperties = {
    left: `${x}%`,
    top: `${y}%`,
    width: `${w}%`,
    height: `${h}%`,
    position: 'absolute',
    cursor: isEditing ? 'text' : 'move',
    userSelect: isEditing ? 'text' : 'none',
  };

  if (block.type === 'text') {
    return (
      <div
        ref={elementRef}
        style={{
          ...commonStyle,
          fontFamily: block.styles.fontFamily || 'Inter, sans-serif',
          fontSize: `${block.styles.fontSize * scale}px`,
          fontWeight: block.styles.fontWeight,
          color: block.styles.color,
          textAlign: block.styles.align,
          lineHeight: block.styles.lineHeight ? `${block.styles.lineHeight}px` : '1.2',
          whiteSpace: 'pre-wrap',
          overflow: 'hidden',
          outline: isSelected ? '2px solid #3b82f6' : '1px solid transparent', // Blue outline when selected
          zIndex: isSelected ? 20 : 10,
        }}
        onMouseDown={handleMouseDown}
        onDoubleClick={() => {
          setIsEditing(true);
          // Wait for render then focus
          setTimeout(() => elementRef.current?.focus(), 0);
        }}
        contentEditable={isEditing}
        suppressContentEditableWarning
        onBlur={(e) => {
          setIsEditing(false);
          onUpdateContent?.(e.currentTarget.innerHTML);
        }}
      >
        {block.html}
      </div>
    );
  }

  // Fallback for other types (Image/Table) - simplified for now
  return (
    <div
      style={{
        ...commonStyle,
        border: isSelected ? '2px solid #3b82f6' : '1px dashed #ccc',
        backgroundColor: 'rgba(0,0,0,0.05)',
        zIndex: isSelected ? 20 : 10,
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 pointer-events-none">
        {block.type}
      </div>
    </div>
  );
};
