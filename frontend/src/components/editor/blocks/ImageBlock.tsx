import React, { useState, useRef, useEffect, useContext } from 'react';
import { ImageBlock as ImageBlockType } from '@/types/hydration';
import { SnapGuideContext, getSnapPoints } from '../context/SnapGuideContext';
import { Image as ImageIcon } from 'lucide-react';

export const ImageBlock = React.memo(({
    block,
    scale,
    isSelected,
    pageWidth,
    pageHeight,
    onSelect,
    onResize
}: {
    block: ImageBlockType;
    scale: number;
    isSelected: boolean;
    pageWidth: number;
    pageHeight: number;
    onSelect: () => void;
    onResize?: (newBox: [number, number, number, number]) => void;
}) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState<string | null>(null);
    const [localBox, setLocalBox] = useState<[number, number, number, number]>(block.box);

    const dragStartRef = useRef<{ x: number; y: number; box: [number, number, number, number] } | null>(null);
    const { setActiveGuides, allBlocks } = useContext(SnapGuideContext);

    // Sync local box with block.box when it changes externally
    useEffect(() => {
        setLocalBox(block.box);
    }, [block.box]);

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

    const [x, y, w, h] = localBox;

    // Handle mouse down for dragging with snapping
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!isSelected) return;
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

            setActiveGuides([...hSnap.guides, ...vSnap.guides]);
            setLocalBox([newX, newY, blockW, blockH]);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setActiveGuides([]);
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

    // Handle resize from corners
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

            if (handle.includes('e')) { newW = Math.max(1, origW + dx); }
            if (handle.includes('w')) { newX = origX + dx; newW = Math.max(1, origW - dx); }
            if (handle.includes('s')) { newH = Math.max(1, origH + dy); }
            if (handle.includes('n')) { newY = origY + dy; newH = Math.max(1, origH - dy); }

            // Clamp
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
            className={`
        absolute transition-none
        ${isSelected ? 'ring-2 ring-blue-500 z-20' : 'hover:ring-2 hover:ring-blue-300 z-10'}
        ${isDragging ? 'cursor-move' : ''}
        ${!isDragging && isSelected ? 'cursor-move' : ''}
        ${!isSelected ? 'cursor-pointer' : ''}
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
            onMouseDown={handleMouseDown}
        >
            {imageUrl && !loadError ? (
                <img
                    src={imageUrl}
                    alt="PDF Image"
                    className="w-full h-full object-contain pointer-events-none"
                    style={{
                        transform: `rotate(${block.rotation || 0}deg)`,
                    }}
                    onError={() => setLoadError(true)}
                />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-100">
                    <ImageIcon size={24} className="mb-1" />
                    <span className="text-xs">Image</span>
                </div>
            )}

            {/* Selection handles */}
            {isSelected && (
                <>
                    <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-nw-resize z-30" onMouseDown={(e) => handleResizeStart(e, 'nw')} />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-ne-resize z-30" onMouseDown={(e) => handleResizeStart(e, 'ne')} />
                    <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-sw-resize z-30" onMouseDown={(e) => handleResizeStart(e, 'sw')} />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-se-resize z-30" onMouseDown={(e) => handleResizeStart(e, 'se')} />
                </>
            )}
        </div>
    );
});
