import { TextBlock, TextRunRaw, TableBlock, TableRow } from "@/types/hydration";

// --- Types ---
export interface Separator {
  type: 'line' | 'rect';
  box: [number, number, number, number];
  orientation: 'horizontal' | 'vertical';
}

export interface GlobalStats {
  dominantFontSize: number;
  dominantLineHeight: number;
  averageCharWidth: number;
  masterGrid: {
    columns: number[];
    margins: { left: number; right: number; top: number; bottom: number };
  };
  typography: {
    h1: number;
    h2: number;
    body: number;
  };
}

// --- Text Line Representation ---
interface TextLine {
  runs: TextRunRaw[];
  y: number;          // Average Y position
  minX: number;
  maxX: number;
  height: number;
  text: string;
  fontSize: number;
  indent: number;     // Left indentation relative to page margin
}

// --- Paragraph Representation ---
interface Paragraph {
  lines: TextLine[];
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  fontSize: number;
  isHeader: boolean;
  isListItem: boolean;
}

// =============================================================================
// 1. GLOBAL STATISTICS ANALYSIS
// =============================================================================

export function calculateGlobalStats(allPagesRuns: TextRunRaw[][]): GlobalStats {
  const allRuns = allPagesRuns.flat();
  if (allRuns.length === 0) {
    return {
      dominantFontSize: 12,
      dominantLineHeight: 16,
      averageCharWidth: 6,
      masterGrid: { columns: [], margins: { left: 50, right: 550, top: 50, bottom: 750 } },
      typography: { h1: 24, h2: 18, body: 12 }
    };
  }

  // Font Size Histogram (weighted by text length)
  const sizeCounts = new Map<number, number>();
  let totalChars = 0;
  let totalWidth = 0;
  
  allRuns.forEach(r => {
    const s = Math.round(r.fontSize);
    const charCount = r.str.length;
    sizeCounts.set(s, (sizeCounts.get(s) || 0) + charCount);
    totalChars += charCount;
    totalWidth += r.width;
  });

  // Find dominant (body) font size
  let bodySize = 12;
  let maxCount = 0;
  sizeCounts.forEach((count, size) => {
    if (count > maxCount) {
      maxCount = count;
      bodySize = size;
    }
  });

  // Calculate typography scale
  const sizes = Array.from(sizeCounts.keys()).sort((a, b) => b - a);
  const h1 = sizes.find(s => s >= bodySize * 1.5) || bodySize * 2;
  const h2 = sizes.find(s => s >= bodySize * 1.2 && s < h1) || bodySize * 1.4;

  // Calculate average character width
  const avgCharWidth = totalChars > 0 ? totalWidth / totalChars : bodySize * 0.5;

  // Detect page margins by analyzing X positions
  const leftEdges: number[] = [];
  const rightEdges: number[] = [];
  
  allRuns.forEach(r => {
    leftEdges.push(r.x);
    rightEdges.push(r.x + r.width);
  });
  
  leftEdges.sort((a, b) => a - b);
  rightEdges.sort((a, b) => b - a);
  
  // Use 5th percentile for margins to handle outliers
  const marginLeft = leftEdges[Math.floor(leftEdges.length * 0.05)] || 50;
  const marginRight = rightEdges[Math.floor(rightEdges.length * 0.05)] || 550;

  // Detect column X positions (significant left-edge alignments)
  const xHist = new Map<number, number>();
  allRuns.forEach(r => {
    const x = Math.round(r.x / 5) * 5; // Quantize to 5pt grid
    xHist.set(x, (xHist.get(x) || 0) + 1);
  });

  const columns: number[] = [];
  const minFreq = allRuns.length * 0.02;
  xHist.forEach((count, x) => {
    if (count >= minFreq) columns.push(x);
  });
  columns.sort((a, b) => a - b);

  return {
    dominantFontSize: bodySize,
    dominantLineHeight: bodySize * 1.35,
    averageCharWidth: avgCharWidth,
    masterGrid: {
      columns,
      margins: { left: marginLeft, right: marginRight, top: 50, bottom: 750 }
    },
    typography: { h1, h2, body: bodySize }
  };
}

// =============================================================================
// 2. TEXT ITEM NORMALIZATION
// =============================================================================

export function normalizeTextItemsToRuns(items: any[], viewport: any): TextRunRaw[] {
  if (!items || items.length === 0) return [];

  const rawRuns: TextRunRaw[] = items
    .filter(item => item.str && item.str.trim().length > 0)
    .map(item => {
      const tx = item.transform;
      const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]) || 
                       Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]) || 12;
      const x = tx[4];
      const y = viewport.height - tx[5];

      return {
        str: item.str,
        x,
        y,
        width: item.width || (item.str.length * fontSize * 0.5),
        height: fontSize * 1.2,
        fontSize,
        fontName: item.fontName || 'unknown',
        dir: item.dir || 'ltr',
        rotation: 0,
        transform: tx,
        color: '#000000'
      };
    });

  if (rawRuns.length === 0) {
    console.warn('No text runs extracted - PDF may be scanned/image-based');
    return [];
  }

  // Clean up: remove shadows/duplicates, merge fragments
  const deduped = removeShadowDuplicates(rawRuns);
  const merged = mergeAdjacentRuns(deduped);
  
  console.log(`normalizeTextItemsToRuns: ${items.length} items → ${merged.length} runs`);
  return merged;
}

function removeShadowDuplicates(runs: TextRunRaw[]): TextRunRaw[] {
  // Sort by position
  runs.sort((a, b) => {
    const yDiff = a.y - b.y;
    if (Math.abs(yDiff) > 2) return yDiff;
    return a.x - b.x;
  });

  const clean: TextRunRaw[] = [];
  for (const run of runs) {
    // Check if this is a duplicate (same text at nearly same position)
    const isDupe = clean.some(c => 
      c.str === run.str && 
      Math.abs(c.x - run.x) < 2 && 
      Math.abs(c.y - run.y) < 2
    );
    if (!isDupe) clean.push(run);
  }
  return clean;
}

function mergeAdjacentRuns(runs: TextRunRaw[]): TextRunRaw[] {
  // Sort by line (Y), then by X
  runs.sort((a, b) => {
    const yDiff = a.y - b.y;
    if (Math.abs(yDiff) > 3) return yDiff;
    return a.x - b.x;
  });

  const merged: TextRunRaw[] = [];
  let current: TextRunRaw | null = null;

  for (const run of runs) {
    if (!current) {
      current = { ...run };
      continue;
    }

    // Check if runs are on same line and adjacent
    const sameLine = Math.abs(current.y - run.y) < (current.fontSize * 0.5);
    const gap = run.x - (current.x + current.width);
    const isAdjacent = gap < (current.fontSize * 0.4) && gap > -(current.fontSize * 0.3);
    const sameFont = Math.abs(current.fontSize - run.fontSize) < 1;

    if (sameLine && isAdjacent && sameFont) {
      // Merge
      current.str += run.str;
      current.width = (run.x + run.width) - current.x;
    } else {
      merged.push(current);
      current = { ...run };
    }
  }
  
  if (current) merged.push(current);
  return merged;
}

// =============================================================================
// 3. SMART LINE DETECTION
// =============================================================================

function groupRunsIntoLines(runs: TextRunRaw[], stats: GlobalStats): TextLine[] {
  if (runs.length === 0) return [];

  // Sort all runs by Y position
  const sorted = [...runs].sort((a, b) => a.y - b.y);
  
  const lines: TextLine[] = [];
  let currentLineRuns: TextRunRaw[] = [sorted[0]];
  let currentY = sorted[0].y;

  for (let i = 1; i < sorted.length; i++) {
    const run = sorted[i];
    const yThreshold = stats.dominantFontSize * 0.6; // Tolerance for same line

    if (Math.abs(run.y - currentY) <= yThreshold) {
      // Same line
      currentLineRuns.push(run);
      // Update Y to weighted average
      currentY = (currentY * (currentLineRuns.length - 1) + run.y) / currentLineRuns.length;
    } else {
      // New line - finalize current
      if (currentLineRuns.length > 0) {
        lines.push(createTextLine(currentLineRuns, stats));
      }
      currentLineRuns = [run];
      currentY = run.y;
    }
  }

  // Don't forget last line
  if (currentLineRuns.length > 0) {
    lines.push(createTextLine(currentLineRuns, stats));
  }

  return lines;
}

function createTextLine(runs: TextRunRaw[], stats: GlobalStats): TextLine {
  // Sort runs left-to-right
  runs.sort((a, b) => a.x - b.x);

  // Calculate bounds
  let minX = Infinity, maxX = -Infinity;
  let totalY = 0, totalHeight = 0, totalFontSize = 0;

  runs.forEach(r => {
    minX = Math.min(minX, r.x);
    maxX = Math.max(maxX, r.x + r.width);
    totalY += r.y;
    totalHeight += r.height;
    totalFontSize += r.fontSize;
  });

  const avgY = totalY / runs.length;
  const avgHeight = totalHeight / runs.length;
  const avgFontSize = totalFontSize / runs.length;

  // Build text with proper spacing
  let text = '';
  for (let i = 0; i < runs.length; i++) {
    if (i > 0) {
      const gap = runs[i].x - (runs[i - 1].x + runs[i - 1].width);
      const spaceWidth = stats.averageCharWidth * 0.8;
      
      if (gap > spaceWidth * 3) {
        // Large gap - tab-like spacing
        text += '\t';
      } else if (gap > spaceWidth * 0.3) {
        // Normal word space
        text += ' ';
      }
      // If gap is tiny or negative, no space needed (kerned text)
    }
    text += runs[i].str;
  }

  return {
    runs,
    y: avgY,
    minX,
    maxX,
    height: avgHeight,
    text: text.trim(),
    fontSize: avgFontSize,
    indent: minX - stats.masterGrid.margins.left
  };
}

// =============================================================================
// 4. SMART PARAGRAPH DETECTION
// =============================================================================

function groupLinesIntoParagraphs(lines: TextLine[], stats: GlobalStats): Paragraph[] {
  if (lines.length === 0) return [];

  // Sort lines by Y position (top to bottom)
  const sorted = [...lines].sort((a, b) => a.y - b.y);
  
  const paragraphs: Paragraph[] = [];
  let currentPara: TextLine[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prevLine = currentPara[currentPara.length - 1];
    const currLine = sorted[i];

    // Calculate vertical gap between lines
    const verticalGap = currLine.y - (prevLine.y + prevLine.height);
    const normalLineGap = stats.dominantLineHeight * 0.4;
    const paragraphGap = stats.dominantLineHeight * 1.0;

    // Check for paragraph break conditions
    const isLargeGap = verticalGap > paragraphGap;
    const isDifferentFontSize = Math.abs(currLine.fontSize - prevLine.fontSize) > 2;
    const isSignificantIndentChange = Math.abs(currLine.indent - prevLine.indent) > stats.dominantFontSize * 3;
    const isPrevLineShort = (prevLine.maxX - prevLine.minX) < (stats.masterGrid.margins.right - stats.masterGrid.margins.left) * 0.6;
    
    // Check if current line looks like a header
    const isHeader = currLine.fontSize > stats.typography.body * 1.15;
    const prevWasHeader = prevLine.fontSize > stats.typography.body * 1.15;

    // Check if current line starts with list marker
    const isListItem = /^[\u2022\u2023\u2043\-\*]\s|^\d+[\.\)]\s|^[a-zA-Z][\.\)]\s/.test(currLine.text);
    const prevWasListItem = /^[\u2022\u2023\u2043\-\*]\s|^\d+[\.\)]\s|^[a-zA-Z][\.\)]\s/.test(prevLine.text);

    // Decide if new paragraph
    const shouldBreak = 
      isLargeGap ||
      (isDifferentFontSize && (isHeader || prevWasHeader)) ||
      (isSignificantIndentChange && !isListItem && !prevWasListItem) ||
      (isPrevLineShort && verticalGap > normalLineGap && !isListItem);

    if (shouldBreak) {
      // Finalize current paragraph
      paragraphs.push(createParagraph(currentPara, stats));
      currentPara = [currLine];
    } else {
      currentPara.push(currLine);
    }
  }

  // Don't forget last paragraph
  if (currentPara.length > 0) {
    paragraphs.push(createParagraph(currentPara, stats));
  }

  return paragraphs;
}

function createParagraph(lines: TextLine[], stats: GlobalStats): Paragraph {
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  let totalFontSize = 0;

  lines.forEach(line => {
    minX = Math.min(minX, line.minX);
    minY = Math.min(minY, line.y);
    maxX = Math.max(maxX, line.maxX);
    maxY = Math.max(maxY, line.y + line.height);
    totalFontSize += line.fontSize;
  });

  const avgFontSize = totalFontSize / lines.length;
  const firstLine = lines[0];

  // Determine if header
  const isHeader = avgFontSize >= stats.typography.h2 || 
                   (lines.length === 1 && avgFontSize > stats.typography.body * 1.1);

  // Determine if list item
  const isListItem = /^[\u2022\u2023\u2043\-\*]\s|^\d+[\.\)]\s|^[a-zA-Z][\.\)]\s/.test(firstLine.text);

  return {
    lines,
    minX,
    minY,
    maxX,
    maxY,
    fontSize: avgFontSize,
    isHeader,
    isListItem
  };
}

// =============================================================================
// 5. COLUMN DETECTION
// =============================================================================

function detectAndSplitColumns(paragraphs: Paragraph[], stats: GlobalStats, pageDims: { width: number; height: number }): Paragraph[][] {
  if (paragraphs.length === 0) return [[]];

  // Analyze X distribution to find column boundaries
  const pageWidth = pageDims.width;
  const midPoint = pageWidth / 2;
  const columnGapThreshold = stats.dominantFontSize * 3;
  
  // Check if there's a clear vertical gap in the middle
  const leftParas: Paragraph[] = [];
  const rightParas: Paragraph[] = [];
  const fullWidthParas: Paragraph[] = [];

  paragraphs.forEach(para => {
    const paraWidth = para.maxX - para.minX;

    // Is this a full-width paragraph?
    if (paraWidth > pageWidth * 0.55) {
      fullWidthParas.push(para);
    } else if (para.maxX < midPoint - columnGapThreshold) {
      leftParas.push(para);
    } else if (para.minX > midPoint + columnGapThreshold) {
      rightParas.push(para);
    } else {
      fullWidthParas.push(para);
    }
  });

  // If we have clear left/right separation, treat as 2 columns
  if (leftParas.length > 2 && rightParas.length > 2) {
    return [
      [...leftParas].sort((a, b) => a.minY - b.minY),
      [...rightParas].sort((a, b) => a.minY - b.minY)
    ];
  }

  // Single column layout - merge all and sort by Y
  return [[...fullWidthParas, ...leftParas, ...rightParas].sort((a, b) => a.minY - b.minY)];
}

// =============================================================================
// 6. MAIN LAYOUT ANALYSIS
// =============================================================================

export function analyzePageLayout(
  runs: TextRunRaw[],
  separators: Separator[],
  pageDims: { width: number; height: number },
  globalStats: GlobalStats
): TextBlock[] {
  if (runs.length === 0) {
    console.log('analyzePageLayout: No runs to process');
    return [];
  }

  console.log(`analyzePageLayout: Processing ${runs.length} runs for ${pageDims.width}x${pageDims.height} page`);

  // Step 1: Group runs into lines
  const lines = groupRunsIntoLines(runs, globalStats);
  console.log(`  → ${lines.length} lines detected`);

  // Step 2: Group lines into paragraphs
  const paragraphs = groupLinesIntoParagraphs(lines, globalStats);
  console.log(`  → ${paragraphs.length} paragraphs detected`);

  // Step 3: Detect columns (optional enhancement)
  const columns = detectAndSplitColumns(paragraphs, globalStats, pageDims);
  console.log(`  → ${columns.length} column(s) detected`);

  // Step 4: Convert paragraphs to TextBlocks
  const blocks: TextBlock[] = [];

  columns.forEach((columnParas, colIndex) => {
    columnParas.forEach(para => {
      const block = paragraphToTextBlock(para, pageDims, globalStats, colIndex);
      if (block.html.trim().length > 0) {
        blocks.push(block);
      }
    });
  });

  // Step 5: Resolve overlapping blocks - push them apart
  const resolvedBlocks = resolveBlockOverlaps(blocks);

  console.log(`  → ${resolvedBlocks.length} text blocks created (overlaps resolved)`);
  return resolvedBlocks;
}

// =============================================================================
// 7. COLLISION DETECTION & RESOLUTION
// =============================================================================

function resolveBlockOverlaps(blocks: TextBlock[]): TextBlock[] {
  if (blocks.length < 2) return blocks;

  // Sort blocks by Y position (top to bottom), then by X (left to right)
  const sorted = [...blocks].sort((a, b) => {
    const yDiff = a.box[1] - b.box[1];
    if (Math.abs(yDiff) > 0.5) return yDiff;
    return a.box[0] - b.box[0];
  });

  // Minimum gap between blocks (in percentage)
  const MIN_GAP = 0.3; // 0.3% of page height

  // Process each block and adjust if it overlaps with previous blocks
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    
    // Check against all previous blocks for overlap
    for (let j = 0; j < i; j++) {
      const other = sorted[j];
      
      // Check if boxes overlap
      const overlap = getOverlap(current.box, other.box);
      
      if (overlap.overlaps) {
        // Determine best direction to push current block
        // Usually push down (increase Y) since we process top-to-bottom
        
        if (overlap.horizontalOverlap > 0 && overlap.verticalOverlap > 0) {
          // Real overlap - need to resolve
          
          // Check if blocks are roughly in the same column (X overlaps significantly)
          const currentCenterX = current.box[0] + current.box[2] / 2;
          const otherCenterX = other.box[0] + other.box[2] / 2;
          const xDistance = Math.abs(currentCenterX - otherCenterX);
          
          if (xDistance < Math.max(current.box[2], other.box[2]) * 0.7) {
            // Same column - push down
            const newY = other.box[1] + other.box[3] + MIN_GAP;
            current.box[1] = newY;
          } else {
            // Different columns - they shouldn't overlap, but if they do,
            // push the one that's more to the right further right
            if (current.box[0] > other.box[0]) {
              current.box[0] = other.box[0] + other.box[2] + MIN_GAP;
            }
          }
        }
      }
    }
  }

  // Ensure no block goes off-page
  sorted.forEach(block => {
    // Clamp Y to page bounds
    if (block.box[1] < 0) block.box[1] = 0;
    if (block.box[1] + block.box[3] > 100) {
      block.box[1] = Math.max(0, 100 - block.box[3]);
    }
    // Clamp X to page bounds
    if (block.box[0] < 0) block.box[0] = 0;
    if (block.box[0] + block.box[2] > 100) {
      block.box[0] = Math.max(0, 100 - block.box[2]);
    }
  });

  return sorted;
}

function getOverlap(boxA: [number, number, number, number], boxB: [number, number, number, number]): {
  overlaps: boolean;
  horizontalOverlap: number;
  verticalOverlap: number;
} {
  // Box format: [x, y, width, height] in percentages
  const [ax, ay, aw, ah] = boxA;
  const [bx, by, bw, bh] = boxB;

  // Calculate overlap in each dimension
  const horizontalOverlap = Math.min(ax + aw, bx + bw) - Math.max(ax, bx);
  const verticalOverlap = Math.min(ay + ah, by + bh) - Math.max(ay, by);

  return {
    overlaps: horizontalOverlap > 0 && verticalOverlap > 0,
    horizontalOverlap: Math.max(0, horizontalOverlap),
    verticalOverlap: Math.max(0, verticalOverlap)
  };
}

function paragraphToTextBlock(
  para: Paragraph,
  pageDims: { width: number; height: number },
  stats: GlobalStats,
  columnIndex: number
): TextBlock {
  // Build clean text from lines
  let html = '';
  
  para.lines.forEach((line, i) => {
    if (i > 0) {
      // Add line break between lines in same paragraph
      html += '\n';
    }
    html += line.text;
  });

  // Calculate box as percentages with small padding
  const padding = 2; // 2pt padding
  const x = ((para.minX - padding) / pageDims.width) * 100;
  const y = ((para.minY - padding) / pageDims.height) * 100;
  const w = ((para.maxX - para.minX + padding * 2) / pageDims.width) * 100;
  const h = ((para.maxY - para.minY + padding * 2) / pageDims.height) * 100;

  // Get font info from first run of first line
  const firstRun = para.lines[0]?.runs[0];
  const fontName = firstRun?.fontName || 'unknown';
  const isBold = fontName.toLowerCase().includes('bold');
  const isItalic = fontName.toLowerCase().includes('italic');

  // Determine semantic role
  let role: 'h1' | 'h2' | 'body' | 'caption' = 'body';
  if (para.fontSize >= stats.typography.h1) role = 'h1';
  else if (para.fontSize >= stats.typography.h2) role = 'h2';
  else if (para.fontSize < stats.typography.body * 0.85) role = 'caption';

  return {
    id: `blk-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    type: 'text',
    html,
    box: [
      Math.max(0, x),
      Math.max(0, y),
      Math.min(100, w),
      Math.min(100, h)
    ],
    styles: {
      fontSize: para.fontSize,
      fontFamily: cleanFontName(fontName),
      fontWeight: isBold || para.isHeader ? 700 : 400,
      color: firstRun?.color || '#000000',
      align: detectAlignment(para, stats),
      letterSpacing: 0,
      italic: isItalic,
      underline: false,
      lineHeight: para.lines.length > 1 ? 1.5 : null
    },
    meta: {
      isHeader: para.isHeader,
      isListItem: para.isListItem,
      isCaption: role === 'caption',
      rotation: 0,
      lineHeightRatio: 1.5,
      columnIndex,
      sourceRuns: para.lines.reduce((sum, l) => sum + l.runs.length, 0)
    }
  };
}

function detectAlignment(para: Paragraph, stats: GlobalStats): 'left' | 'center' | 'right' | 'justify' {
  const leftMargin = stats.masterGrid.margins.left;
  const rightMargin = stats.masterGrid.margins.right;
  const pageWidth = rightMargin - leftMargin;

  const paraWidth = para.maxX - para.minX;
  const leftOffset = para.minX - leftMargin;
  const rightOffset = rightMargin - para.maxX;

  // If paragraph is centered
  if (Math.abs(leftOffset - rightOffset) < pageWidth * 0.1 && paraWidth < pageWidth * 0.7) {
    return 'center';
  }

  // If aligned to right
  if (rightOffset < leftOffset * 0.3 && leftOffset > pageWidth * 0.2) {
    return 'right';
  }

  // Default to left
  return 'left';
}

function cleanFontName(fontName: string): string {
  if (!fontName || fontName === 'unknown') return 'Inter, sans-serif';
  
  let name = fontName.includes('+') ? fontName.split('+')[1] : fontName;
  name = name.replace(/[-_]/g, ' ').trim();
  const lower = name.toLowerCase();

  if (lower.includes('arial')) return 'Arial, sans-serif';
  if (lower.includes('times')) return '"Times New Roman", serif';
  if (lower.includes('courier')) return '"Courier New", monospace';
  if (lower.includes('helvetica')) return 'Helvetica, Arial, sans-serif';
  if (lower.includes('georgia')) return 'Georgia, serif';
  if (lower.includes('verdana')) return 'Verdana, sans-serif';
  if (lower.includes('roboto')) return 'Roboto, sans-serif';

  return 'Inter, sans-serif';
}

// =============================================================================
// EXPORTS FOR COMPATIBILITY
// =============================================================================

export function detectColumns(l: any, w: any) { return l; }
export function detectTables(l: any, d: any, s: any) { return { tables: [], remainingLines: l }; }
export function groupRunsIntoLinesExport(r: any, s: any) { return groupRunsIntoLines(r, s); }
export function paragraphsToBlocks(p: any, d: any, s: any) { return []; }
export function analyzeFontStatistics(r: any) { 
  return { dominantFontSize: 12, dominantLineHeight: 14, spaceWidth: 4 };
}
