/**
 * Text Detection Algorithm
 * 
 * Clusters PDF text runs into lines and paragraphs.
 * Implements the algorithm described in docs/02-TEXT-EXTRACTION.md
 */

import type { TextRun, TextLine, TextBlock } from '@/types';

/**
 * Group text runs into horizontal lines
 * 
 * Algorithm:
 * 1. Sort runs by Y position (top to bottom)
 * 2. Cluster runs with similar Y coordinates (± 0.3 * height)
 * 3. Sort runs within each line by X position (left to right)
 */
export function groupIntoLines(runs: TextRun[]): TextLine[] {
  if (runs.length === 0) return [];

  // Sort by Y position (descending, since PDF Y increases downward)
  const sorted = [...runs].sort((a, b) => b.y - a.y);

  const lines: TextLine[] = [];
  let currentLine: TextRun[] = [];
  let currentY: number | null = null;

  for (const run of sorted) {
    // Check if this run belongs to current line
    // Allow 30% height tolerance for superscript/subscript
    const threshold = run.height * 0.3;
    
    if (currentY === null || Math.abs(run.y - currentY) < threshold) {
      currentLine.push(run);
      if (currentY === null) {
        currentY = run.y;
      }
    } else {
      // Start new line
      if (currentLine.length > 0) {
        lines.push(createTextLine(currentLine, currentY!));
      }
      currentLine = [run];
      currentY = run.y;
    }
  }

  // Add last line
  if (currentLine.length > 0 && currentY !== null) {
    lines.push(createTextLine(currentLine, currentY));
  }

  return lines;
}

/**
 * Create a TextLine from runs
 */
function createTextLine(runs: TextRun[], y: number): TextLine {
  // Sort runs left-to-right
  const sortedRuns = [...runs].sort((a, b) => a.x - b.x);

  // Combine text with spaces
  const text = sortedRuns.map(r => r.str).join(' ');

  // Calculate bounding box
  const xs = sortedRuns.map(r => r.x);
  const widths = sortedRuns.map(r => r.width);
  const heights = sortedRuns.map(r => r.height);

  const x = Math.min(...xs);
  const width = Math.max(...xs.map((x, i) => x + widths[i])) - x;
  const height = Math.max(...heights);

  return {
    text,
    runs: sortedRuns,
    y,
    x,
    width,
    height,
  };
}

/**
 * Detect paragraph breaks between lines
 * 
 * Algorithm:
 * - If vertical gap > 1.5x line height → paragraph break
 * - If vertical gap > 2.5x line height → section break (heading)
 */
export function detectParagraphBreaks(lines: TextLine[]): number[] {
  if (lines.length < 2) return [];

  const breaks: number[] = [];

  for (let i = 0; i < lines.length - 1; i++) {
    const currentLine = lines[i];
    const nextLine = lines[i + 1];

    // Calculate vertical gap
    const gap = currentLine.y - nextLine.y;

    // Estimate line height from current line
    const lineHeight = currentLine.height || 12;

    // If gap > 1.5x line height, it's a paragraph break
    if (gap > lineHeight * 1.5) {
      breaks.push(i + 1); // Break after line i
    }
  }

  return breaks;
}

/**
 * Group lines into text blocks (paragraphs)
 */
export function groupLinesIntoBlocks(
  lines: TextLine[],
  pageNumber: number
): TextBlock[] {
  if (lines.length === 0) return [];

  const breaks = detectParagraphBreaks(lines);
  const blocks: TextBlock[] = [];

  let startIdx = 0;
  breaks.forEach((breakIdx, i) => {
    const blockLines = lines.slice(startIdx, breakIdx);
    if (blockLines.length > 0) {
      blocks.push(createTextBlock(blockLines, pageNumber, i));
    }
    startIdx = breakIdx;
  });

  // Add last block
  if (startIdx < lines.length) {
    const blockLines = lines.slice(startIdx);
    blocks.push(createTextBlock(blockLines, pageNumber, breaks.length));
  }

  return blocks;
}

/**
 * Create a TextBlock from lines
 */
function createTextBlock(
  lines: TextLine[],
  pageNumber: number,
  blockIndex: number
): TextBlock {
  // Calculate bounding box
  const allRuns = lines.flatMap(line => line.runs);
  const xs = allRuns.map(r => r.x);
  const ys = allRuns.map(r => r.y);
  const rights = allRuns.map(r => r.x + r.width);
  const tops = allRuns.map(r => r.y + r.height);

  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const width = Math.max(...rights) - x;
  const height = Math.max(...tops) - y;

  // Combine text with line breaks
  const text = lines.map(line => line.text).join('\n');

  // Calculate dominant font size (median)
  const fontSizes = allRuns.map(r => r.fontSize).sort((a, b) => a - b);
  const fontSize = fontSizes[Math.floor(fontSizes.length / 2)] || 12;

  // Detect if this is likely a heading (larger font)
  const avgFontSize = fontSizes.reduce((sum, size) => sum + size, 0) / fontSizes.length;
  const isHeading = fontSize > avgFontSize * 1.3;

  return {
    id: `block_${pageNumber}_${blockIndex}`,
    pageNumber,
    x,
    y,
    width,
    height,
    text,
    lines,
    fontSize,
    fontFamily: 'Helvetica', // TODO: Resolve from font name
    lineHeight: 1.2,
    confidence: 0.9,
    isHeading,
  };
}

/**
 * Detect multi-column layouts
 * 
 * Clusters lines by X position to identify columns.
 */
export function detectColumns(lines: TextLine[]): TextLine[][] {
  if (lines.length === 0) return [];

  // Cluster by X position
  const clusters: TextLine[][] = [];
  const columnThreshold = 50; // 50pt horizontal gap = new column

  for (const line of lines) {
    const x = line.x;

    // Find existing cluster
    let found = false;
    for (const cluster of clusters) {
      const clusterX = cluster[0]?.x || 0;
      if (Math.abs(x - clusterX) < columnThreshold) {
        cluster.push(line);
        found = true;
        break;
      }
    }

    if (!found) {
      clusters.push([line]);
    }
  }

  // Sort clusters left-to-right
  clusters.sort((a, b) => {
    const aX = a[0]?.x || 0;
    const bX = b[0]?.x || 0;
    return aX - bX;
  });

  return clusters;
}

/**
 * Main text detection function
 * 
 * Converts raw text runs into structured text blocks.
 */
export function detectTextBlocks(
  runs: TextRun[],
  pageNumber: number,
  options?: {
    detectColumns?: boolean;
  }
): TextBlock[] {
  if (runs.length === 0) return [];

  console.log(`[detectTextBlocks] Processing ${runs.length} text runs on page ${pageNumber}`);

  // Step 1: Group runs into lines
  const lines = groupIntoLines(runs);
  console.log(`[detectTextBlocks] Detected ${lines.length} lines`);

  // Step 2: Detect columns (optional)
  if (options?.detectColumns) {
    const columns = detectColumns(lines);
    console.log(`[detectTextBlocks] Detected ${columns.length} columns`);

    // Process each column separately
    const allBlocks: TextBlock[] = [];
    columns.forEach((columnLines) => {
      const blocks = groupLinesIntoBlocks(columnLines, pageNumber);
      allBlocks.push(...blocks);
    });

    return allBlocks;
  }

  // Step 3: Group lines into blocks
  const blocks = groupLinesIntoBlocks(lines, pageNumber);
  console.log(`[detectTextBlocks] Detected ${blocks.length} text blocks`);

  return blocks;
}

/**
 * Calculate median of an array
 */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}
