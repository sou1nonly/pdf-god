import React, { createContext } from 'react';
import { SNAP_THRESHOLD } from '@/lib/editor/constants';

// Context for sharing snap guides across blocks
export interface SnapGuideContextType {
    activeGuides: { type: 'h' | 'v'; position: number }[];
    setActiveGuides: (guides: { type: 'h' | 'v'; position: number }[]) => void;
    allBlocks: { id: string; box: [number, number, number, number] }[];
}

export const SnapGuideContext = createContext<SnapGuideContextType>({
    activeGuides: [],
    setActiveGuides: () => { },
    allBlocks: [],
});

// Calculate snap points for a given position
export function getSnapPoints(
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
