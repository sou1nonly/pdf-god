/**
 * Semantic Merger
 * 
 * Bridges the semantic engine's clean text with the hydration engine's precise layout.
 * Matches semantic sections to hydration blocks by bounding-box overlap and replaces
 * the block's HTML with the semantic engine's non-overlapping text content.
 * 
 * Input:  HydratedPage[] (positions + fonts)  +  SemanticSection[] (clean text)
 * Output: HydratedPage[] with improved block.html
 */

import type { HydratedPage, TextBlock } from '@/types/hydration';
import type { SemanticSection } from '@/lib/semantic/types';

// ============================================================================
// Types
// ============================================================================

interface MergeResult {
    pages: HydratedPage[];
    stats: {
        totalBlocks: number;
        mergedBlocks: number;
        unmatchedSections: number;
    };
}

// ============================================================================
// Bounding Box Utilities
// ============================================================================

type Box = [number, number, number, number]; // [x, y, width, height]

/**
 * Calculate intersection area between two boxes
 */
function intersectionArea(a: Box, b: Box): number {
    const [ax, ay, aw, ah] = a;
    const [bx, by, bw, bh] = b;

    const overlapX = Math.max(0, Math.min(ax + aw, bx + bw) - Math.max(ax, bx));
    const overlapY = Math.max(0, Math.min(ay + ah, by + bh) - Math.max(ay, by));

    return overlapX * overlapY;
}

/**
 * Calculate area of a box
 */
function boxArea(box: Box): number {
    return box[2] * box[3];
}

/**
 * Calculate Intersection over Union (IoU) between two boxes
 */
function iou(a: Box, b: Box): number {
    const inter = intersectionArea(a, b);
    if (inter === 0) return 0;

    const areaA = boxArea(a);
    const areaB = boxArea(b);
    const union = areaA + areaB - inter;

    return union > 0 ? inter / union : 0;
}

/**
 * Calculate how much of box A is covered by box B
 * Returns 0-1 (percentage of A that overlaps with B)
 */
function overlapRatio(a: Box, b: Box): number {
    const inter = intersectionArea(a, b);
    const areaA = boxArea(a);
    return areaA > 0 ? inter / areaA : 0;
}

// ============================================================================
// Text Formatting
// ============================================================================

/**
 * Convert plain text back to simple HTML for block.html
 * Preserves the structure that HydratedPageView expects
 */
function textToHtml(text: string, styles?: { fontWeight?: number; italic?: boolean; underline?: boolean }): string {
    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Wrap in span with basic styling
    const styleAttrs: string[] = [];
    if (styles?.fontWeight && styles.fontWeight >= 600) {
        styleAttrs.push('font-weight: bold');
    }
    if (styles?.italic) {
        styleAttrs.push('font-style: italic');
    }
    if (styles?.underline) {
        styleAttrs.push('text-decoration: underline');
    }

    const styleStr = styleAttrs.length > 0 ? ` style="${styleAttrs.join('; ')}"` : '';
    return `<span${styleStr}>${html}</span>`;
}

// ============================================================================
// Core Merger
// ============================================================================

/**
 * Merge semantic sections into hydration blocks.
 * 
 * Strategy:
 * 1. Group sections by pageIndex
 * 2. For each page, match sections to blocks using bounding-box overlap
 * 3. Replace block.html with semantic content (clean text)
 * 4. Normalize font sizes: paragraphs & list-items → bodyFontSize, headings keep original
 * 5. Keep block.box (positions) from hydration
 */
export function mergeSemanticIntoHydration(
    pages: HydratedPage[],
    sections: SemanticSection[],
    bodyFontSize?: number
): MergeResult {
    let totalBlocks = 0;
    let mergedBlocks = 0;
    let unmatchedSections = 0;

    // Group sections by page
    const sectionsByPage = new Map<number, SemanticSection[]>();
    for (const section of sections) {
        // Flatten list sections — use children directly
        if (section.type === 'list' && section.children) {
            for (const child of section.children) {
                const arr = sectionsByPage.get(child.pageIndex) || [];
                arr.push(child);
                sectionsByPage.set(child.pageIndex, arr);
            }
        } else {
            const arr = sectionsByPage.get(section.pageIndex) || [];
            arr.push(section);
            sectionsByPage.set(section.pageIndex, arr);
        }
    }

    const mergedPages = pages.map((page, pageIndex) => {
        const pageSections = sectionsByPage.get(pageIndex) || [];

        if (pageSections.length === 0) {
            totalBlocks += page.blocks.filter(b => b.type === 'text').length;
            return page; // No sections for this page, keep as-is
        }

        // Track which sections have been matched
        const matchedSections = new Set<number>();

        const mergedBlocks2 = page.blocks.map(block => {
            if (block.type !== 'text') return block;

            totalBlocks++;
            const textBlock = block as TextBlock;
            const blockBox = textBlock.box;

            // Find best matching section by overlap
            let bestMatch: { section: SemanticSection; score: number; index: number } | null = null;

            for (let i = 0; i < pageSections.length; i++) {
                if (matchedSections.has(i)) continue;

                const section = pageSections[i];
                if (!section.originalBox) continue;

                // Calculate overlap of section's originalBox with this block
                const score = overlapRatio(section.originalBox as Box, blockBox as Box);

                if (score > 0.3 && (!bestMatch || score > bestMatch.score)) {
                    bestMatch = { section, score, index: i };
                }
            }

            if (!bestMatch) {
                // No match — try IoU as fallback (handles slight misalignment)
                for (let i = 0; i < pageSections.length; i++) {
                    if (matchedSections.has(i)) continue;
                    const section = pageSections[i];
                    if (!section.originalBox) continue;

                    const score = iou(section.originalBox as Box, blockBox as Box);
                    if (score > 0.2 && (!bestMatch || score > bestMatch.score)) {
                        bestMatch = { section, score, index: i };
                    }
                }
            }

            if (bestMatch) {
                matchedSections.add(bestMatch.index);
                mergedBlocks++;

                const sectionType = bestMatch.section.type;
                const isHeading = sectionType === 'heading';

                // Normalize font size (keep original HTML with all formatting intact):
                // - Headings: keep their original (larger) size
                // - Paragraphs & list-items: normalize to bodyFontSize for consistency
                const normalizedStyles = { ...textBlock.styles };
                if (bodyFontSize && !isHeading) {
                    normalizedStyles.fontSize = bodyFontSize;
                }

                // Keep original block.html — it preserves bold, italic, underline, links, spacing
                // Only normalize the font size via styles
                return {
                    ...textBlock,
                    styles: normalizedStyles,
                };
            }

            return block; // No match, keep original
        });

        // Count unmatched sections
        unmatchedSections += pageSections.filter((_, i) => !matchedSections.has(i)).length;

        // ---- Block consolidation pass ----
        // Group adjacent text blocks with same font size/weight into larger blocks
        // This prevents overlapping and creates more cohesive text regions
        const consolidated = consolidateAdjacentBlocks(mergedBlocks2, bodyFontSize);

        return {
            ...page,
            blocks: consolidated,
        };
    });

    console.log(`[Semantic Merger] ${mergedBlocks}/${totalBlocks} blocks merged, ${unmatchedSections} unmatched sections`);

    return {
        pages: mergedPages,
        stats: {
            totalBlocks,
            mergedBlocks,
            unmatchedSections,
        },
    };
}

// ============================================================================
// Block Consolidation
// ============================================================================

/**
 * Consolidate adjacent text blocks with the same visual style into larger blocks.
 *
 * The hydration engine creates one block per text run / line. This causes:
 *  - Visual overlap between tightly-spaced blocks
 *  - Too many tiny sections that hurt AI editing accuracy
 *  - Higher memory usage
 *
 * This pass groups vertically-adjacent same-style text blocks and merges them.
 */
function consolidateAdjacentBlocks(
    blocks: (HydratedPage['blocks'][0])[],
    bodyFontSize?: number
): (HydratedPage['blocks'][0])[] {
    // Separate text blocks from non-text (images, tables)
    const textBlocks: TextBlock[] = [];
    const nonTextBlocks: (HydratedPage['blocks'][0])[] = [];

    for (const block of blocks) {
        if (block.type === 'text') {
            textBlocks.push(block as TextBlock);
        } else {
            nonTextBlocks.push(block);
        }
    }

    if (textBlocks.length <= 1) {
        return blocks; // Nothing to consolidate
    }

    // Sort text blocks by Y position (top to bottom), then X (left to right)
    textBlocks.sort((a, b) => {
        const dy = a.box[1] - b.box[1];
        if (Math.abs(dy) > 0.3) return dy; // 0.3% Y gap = same line threshold
        return a.box[0] - b.box[0]; // Left to right
    });

    // Group into clusters based on proximity and style similarity
    const MAX_GROUP_SIZE = 6; // Limit to prevent mega-blocks
    const groups: TextBlock[][] = [];
    let currentGroup: TextBlock[] = [textBlocks[0]];

    for (let i = 1; i < textBlocks.length; i++) {
        const prev = currentGroup[currentGroup.length - 1];
        const curr = textBlocks[i];

        const canMerge = currentGroup.length < MAX_GROUP_SIZE
            && shouldConsolidate(prev, curr, bodyFontSize);

        if (canMerge) {
            currentGroup.push(curr);
        } else {
            groups.push(currentGroup);
            currentGroup = [curr];
        }
    }
    groups.push(currentGroup);

    // Merge each group into a single block
    const consolidatedTextBlocks = groups.map(group => {
        if (group.length === 1) return group[0];
        return mergeBlockGroup(group);
    });

    // Re-combine with non-text blocks and sort by Y position
    const allBlocks = [...consolidatedTextBlocks, ...nonTextBlocks];
    allBlocks.sort((a, b) => a.box[1] - b.box[1]);

    return allBlocks;
}

/**
 * Decide if two adjacent text blocks should be consolidated.
 * Conservative rules to avoid creating mega-blocks:
 *  1. Vertically close (within 1.5% page height)
 *  2. Same column (horizontal overlap)
 *  3. Same font size
 *  4. Same font weight AND italic — blocks with different inline styles stay separate
 *  5. Heading/non-heading boundaries are preserved
 */
function shouldConsolidate(
    a: TextBlock,
    b: TextBlock,
    bodyFontSize?: number
): boolean {
    const [ax, ay, aw, ah] = a.box;
    const [bx, by, bw, _bh] = b.box;

    // 1. Vertical proximity: bottom of A to top of B within 1.5% page height
    const aBottom = ay + ah;
    const verticalGap = by - aBottom;
    if (verticalGap > 1.5 || verticalGap < -0.5) return false;

    // 2. Horizontal overlap: blocks must be in the same column
    const aRight = ax + aw;
    const bRight = bx + bw;
    const overlapStart = Math.max(ax, bx);
    const overlapEnd = Math.min(aRight, bRight);
    const horizontalOverlap = Math.max(0, overlapEnd - overlapStart);
    const minWidth = Math.min(aw, bw);
    if (minWidth > 0 && horizontalOverlap / minWidth < 0.3) return false;

    // 3. Font size similarity
    const aSz = bodyFontSize && !a.meta.isHeader ? bodyFontSize : a.styles.fontSize;
    const bSz = bodyFontSize && !b.meta.isHeader ? bodyFontSize : b.styles.fontSize;
    if (Math.abs(aSz - bSz) > 2) return false;

    // 4. Don't merge headings with non-headings
    if (a.meta.isHeader !== b.meta.isHeader) return false;

    // 5. Same font weight & italic — different inline styles = different block
    if (a.styles.fontWeight !== b.styles.fontWeight) return false;
    if (a.styles.italic !== b.styles.italic) return false;

    return true;
}

/**
 * Merge a group of text blocks into a single block.
 * Each sub-block's HTML is wrapped in a <span> carrying its individual
 * bold/italic/underline/color styles so inline formatting is preserved.
 */
function mergeBlockGroup(group: TextBlock[]): TextBlock {
    const first = group[0];

    // Combine bounding boxes
    let minX = first.box[0];
    let minY = first.box[1];
    let maxX = first.box[0] + first.box[2];
    let maxY = first.box[1] + first.box[3];

    const htmlParts: string[] = [];

    for (const block of group) {
        minX = Math.min(minX, block.box[0]);
        minY = Math.min(minY, block.box[1]);
        maxX = Math.max(maxX, block.box[0] + block.box[2]);
        maxY = Math.max(maxY, block.box[1] + block.box[3]);

        // Wrap each block's HTML in a span with its own inline styles
        const inlineStyles: string[] = [];
        if (block.styles.fontWeight >= 600) {
            inlineStyles.push('font-weight:bold');
        }
        if (block.styles.italic) {
            inlineStyles.push('font-style:italic');
        }
        if (block.styles.underline) {
            inlineStyles.push('text-decoration:underline');
        }
        if (block.styles.color && block.styles.color !== first.styles.color) {
            inlineStyles.push(`color:${block.styles.color}`);
        }

        if (inlineStyles.length > 0) {
            htmlParts.push(`<span style="${inlineStyles.join(';')}">${block.html}</span>`);
        } else {
            htmlParts.push(block.html);
        }
    }

    return {
        ...first,
        box: [minX, minY, maxX - minX, maxY - minY],
        html: htmlParts.join(' '),
        meta: {
            ...first.meta,
            sourceRuns: group.reduce((sum, b) => sum + b.meta.sourceRuns, 0),
        },
    };
}


/**
 * Get all section IDs mapped to their corresponding hydration block IDs.
 * Used for AI edit → hydration sync.
 */
export function buildSectionToBlockMap(
    pages: HydratedPage[],
    sections: SemanticSection[]
): Map<string, { pageIndex: number; blockId: string }> {
    const map = new Map<string, { pageIndex: number; blockId: string }>();

    // Group sections by page
    const sectionsByPage = new Map<number, SemanticSection[]>();
    for (const section of sections) {
        if (section.type === 'list' && section.children) {
            for (const child of section.children) {
                const arr = sectionsByPage.get(child.pageIndex) || [];
                arr.push(child);
                sectionsByPage.set(child.pageIndex, arr);
            }
        } else {
            const arr = sectionsByPage.get(section.pageIndex) || [];
            arr.push(section);
            sectionsByPage.set(section.pageIndex, arr);
        }
    }

    for (const page of pages) {
        const pageSections = sectionsByPage.get(page.pageIndex) || [];
        const matchedSections = new Set<number>();

        for (const block of page.blocks) {
            if (block.type !== 'text') continue;
            const textBlock = block as TextBlock;

            for (let i = 0; i < pageSections.length; i++) {
                if (matchedSections.has(i)) continue;
                const section = pageSections[i];
                if (!section.originalBox) continue;

                const score = overlapRatio(section.originalBox as Box, textBlock.box as Box);
                if (score > 0.3) {
                    matchedSections.add(i);
                    map.set(section.id, { pageIndex: page.pageIndex, blockId: block.id });
                    break;
                }
            }
        }
    }

    return map;
}
