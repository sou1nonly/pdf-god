import React, { useState, useRef, useEffect, useContext } from 'react';
import { TextBlock as TextBlockType, TextBlockStyles } from '@/types/hydration';
import { SnapGuideContext, getSnapPoints } from '../context/SnapGuideContext';

export const TextBlock = React.memo(({
    block,
    scale,
    pageWidth,
    pageHeight,
    isSelected,
    onSelect,
    onUpdateContent,
    onResize,
    onTextSelectionChange,
    onUpdateStyles,
    onTextEditingChange
}: {
    block: TextBlockType;
    scale: number;
    pageWidth: number;
    pageHeight: number;
    isSelected: boolean;
    onSelect: () => void;
    onUpdateContent: (html: string) => void;
    onResize?: (newBox: [number, number, number, number]) => void;
    onTextSelectionChange?: (hasSelection: boolean) => void;
    onUpdateStyles?: (styles: Partial<TextBlockStyles>) => void;
    onTextEditingChange?: (isEditing: boolean, blockId?: string, styles?: any) => void;
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState<string | null>(null);
    const [localBox, setLocalBox] = useState<[number, number, number, number]>(block.box);
    const [hasTextSelection, setHasTextSelection] = useState(false);
    const [toolbarPosition, setToolbarPosition] = useState<{ top: number; left: number } | null>(null);
    const elementRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const dragStartRef = useRef<{ x: number; y: number; box: [number, number, number, number] } | null>(null);

    // Get snap context
    const { setActiveGuides, allBlocks } = useContext(SnapGuideContext);

    // Sync local box with block.box when it changes externally
    useEffect(() => {
        setLocalBox(block.box);
    }, [block.box]);

    // Notify parent when text editing state changes (for bottom TextToolbar)
    useEffect(() => {
        if (isEditing || isSelected) {
            onTextEditingChange?.(true, block.id, {
                fontFamily: block.styles.fontFamily || 'Inter, sans-serif',
                fontSize: block.styles.fontSize || 12,
                fontWeight: block.styles.fontWeight || 400,
                italic: block.styles.italic || false,
                underline: block.styles.underline || false,
                align: block.styles.align || 'left',
                color: block.styles.color || '#000000',
            });
        } else {
            // Pass block.id so parent knows WHO is stopping editing
            onTextEditingChange?.(false, block.id);
        }
    }, [isEditing, isSelected, block.styles, onTextEditingChange, block.id]);

    // Track text selection changes and calculate toolbar position
    useEffect(() => {
        const checkSelection = () => {
            if (!isEditing || !elementRef.current || !wrapperRef.current) {
                if (hasTextSelection) {
                    setHasTextSelection(false);
                    setToolbarPosition(null);
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

                // Calculate toolbar position relative to wrapper
                if (hasSelection) {
                    const rangeRect = range.getBoundingClientRect();
                    const wrapperRect = wrapperRef.current.getBoundingClientRect();

                    setToolbarPosition({
                        top: rangeRect.top - wrapperRect.top - 48, // 48px above selection
                        left: rangeRect.left - wrapperRect.left + (rangeRect.width / 2) - 200, // Centered, assuming ~400px toolbar width
                    });
                } else {
                    setToolbarPosition(null);
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
            ref={wrapperRef}
            className={`
        absolute
        ${isSelected ? 'ring-2 ring-blue-500 z-30' : 'z-10'}
        ${isResizing ? 'overflow-visible' : ''}
      `}
            style={{
                left: `${x}%`,
                top: `${y}%`,
                width: `${w}%`,
                minHeight: `${h}%`,
                height: isResizing ? `${h}%` : 'auto',
            }}
        >
            {/* Editable content div */}
            <div
                ref={elementRef}
                className={`
          w-full h-full
          ${isSelected ? '' : 'hover:bg-blue-50/30'}
          ${isEditing ? 'cursor-text bg-white shadow-lg' : 'overflow-visible'}
          ${isDragging ? 'cursor-move' : ''}
          ${!isEditing && !isDragging && isSelected ? 'cursor-move' : ''}
          ${!isSelected ? 'cursor-pointer' : ''}
        `}
                style={{
                    fontFamily: block.styles.fontFamily || 'Inter, system-ui, sans-serif',
                    fontSize: `${scaledFontSize}px`,
                    fontWeight: isHeader ? 700 : (block.styles.fontWeight || 400),
                    fontStyle: block.styles.italic ? 'italic' : 'normal',
                    textDecoration: textDecoration,
                    color: block.styles.color || '#1a1a1a',
                    textAlign: (block.styles.align as any) || 'left',
                    lineHeight: block.styles.lineHeight || (isHeader ? 1.2 : 1.4),
                    letterSpacing: isHeader ? '-0.01em' : '0',
                    padding: '0px',
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
                    setTimeout(() => {
                        if (elementRef.current) {
                            elementRef.current.focus();
                            const selection = window.getSelection();
                            const range = document.createRange();
                            if (selection) {
                                range.selectNodeContents(elementRef.current);
                                range.collapse(false);
                                selection.removeAllRanges();
                                selection.addRange(range);
                            }
                        }
                    }, 0);
                }}
                contentEditable={isEditing}
                suppressContentEditableWarning
                onBlur={(e) => {
                    setIsEditing(false);
                    onUpdateContent(e.currentTarget.innerHTML);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                        setIsEditing(false);
                        elementRef.current?.blur();
                    }
                    if (e.ctrlKey || e.metaKey) {
                        if (e.key === 'b') {
                            e.preventDefault();
                            document.execCommand('bold');
                        } else if (e.key === 'i') {
                            e.preventDefault();
                            document.execCommand('italic');
                        } else if (e.key === 'u') {
                            e.preventDefault();
                            document.execCommand('underline');
                        }
                    }
                }}
                dangerouslySetInnerHTML={{ __html: block.html }}
            />

            {/* Resize handles - outside contentEditable element */}
            {isSelected && !isEditing && (
                <>
                    <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 cursor-nw-resize z-50" onMouseDown={(e) => handleResizeStart(e, 'nw')} />
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 cursor-ne-resize z-50" onMouseDown={(e) => handleResizeStart(e, 'ne')} />
                    <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 cursor-sw-resize z-50" onMouseDown={(e) => handleResizeStart(e, 'sw')} />
                    <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 cursor-se-resize z-50" onMouseDown={(e) => handleResizeStart(e, 'se')} />
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-1.5 bg-blue-500 cursor-n-resize z-50" onMouseDown={(e) => handleResizeStart(e, 'n')} />
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1.5 bg-blue-500 cursor-s-resize z-50" onMouseDown={(e) => handleResizeStart(e, 's')} />
                    <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-1.5 h-4 bg-blue-500 cursor-w-resize z-50" onMouseDown={(e) => handleResizeStart(e, 'w')} />
                    <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-1.5 h-4 bg-blue-500 cursor-e-resize z-50" onMouseDown={(e) => handleResizeStart(e, 'e')} />
                </>
            )}
        </div>
    );
});
