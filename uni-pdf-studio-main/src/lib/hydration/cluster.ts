import { TextBlock, TextLine, TextParagraph, TextRunRaw, ImageBlock, TableBlock, TableRow, TableCell } from "@/types/hydration";

// Constants for heuristics (Defaults)
const DEFAULT_Y_TOLERANCE = 4; 
const DEFAULT_COL_GAP_THRESHOLD = 20; 
const DEFAULT_X_ALIGN_TOLERANCE = 10; 
const DEFAULT_PARAGRAPH_BREAK_RATIO = 1.8; 
const DEFAULT_TABLE_ROW_GAP_THRESHOLD = 10; 

export interface PageStats {
  dominantFontSize: number;
  dominantLineHeight: number;
  fontGroups: Map<string, number>; // Font signature -> count
}

export function analyzeFontStatistics(runs: TextRunRaw[]): PageStats {
  if (runs.length === 0) {
    return {
      dominantFontSize: 12,
      dominantLineHeight: 14,
      fontGroups: new Map()
    };
  }

  const fontSizeCounts = new Map<number, number>();
  const fontGroups = new Map<string, number>();
  
  runs.forEach(run => {
    // Round font size to nearest 0.5 to group similar sizes
    const size = Math.round(run.fontSize * 2) / 2;
    fontSizeCounts.set(size, (fontSizeCounts.get(size) || 0) + run.str.length); // Weight by text length
    
    const fontSig = `${run.fontName}-${size}`;
    fontGroups.set(fontSig, (fontGroups.get(fontSig) || 0) + 1);
  });

  // Find dominant font size
  let dominantFontSize = 12;
  let maxCount = 0;
  fontSizeCounts.forEach((count, size) => {
    if (count > maxCount) {
      maxCount = count;
      dominantFontSize = size;
    }
  });

  // Estimate line height
  // We need sorted runs to find vertical gaps
  const sortedRuns = [...runs].sort((a, b) => a.y - b.y);
  const gapCounts = new Map<number, number>();
  
  for (let i = 1; i < sortedRuns.length; i++) {
    const gap = sortedRuns[i].y - sortedRuns[i-1].y;
    if (gap > 0 && gap < dominantFontSize * 3) { // Filter out large gaps (paragraphs/sections)
      const roundedGap = Math.round(gap);
      gapCounts.set(roundedGap, (gapCounts.get(roundedGap) || 0) + 1);
    }
  }
  
  let dominantLineHeight = dominantFontSize * 1.2; // Default fallback
  let maxGapCount = 0;
  gapCounts.forEach((count, gap) => {
    if (count > maxGapCount) {
      maxGapCount = count;
      dominantLineHeight = gap;
    }
  });

  return {
    dominantFontSize,
    dominantLineHeight,
    fontGroups
  };
}

/**
 * Normalize raw PDF.js items into a consistent coordinate system

/**
 * Normalize raw PDF.js items into a consistent coordinate system
 * PDF.js uses bottom-left origin, we want top-left for easier UI mapping
 */
export function normalizeTextItemsToRuns(items: any[], viewport: any): TextRunRaw[] {
  return items.map(item => {
    // item.transform is [scaleX, skewY, skewX, scaleY, translateX, translateY]
    const tx = item.transform;
    
    // Calculate rotation from transform matrix
    // rotation = atan2(skewY, scaleX) * (180/PI)
    const rotationRad = Math.atan2(tx[1], tx[0]);
    const rotationDeg = (rotationRad * 180) / Math.PI;

    // Get font size from transform (approximate height)
    // scaleY is usually the font size in PDF units
    const fontSize = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]);

    // Normalize coordinates to top-left origin
    // PDF.js viewport.convertToViewportPoint handles the transform
    // But raw item.transform[4], item.transform[5] are in PDF user space (bottom-left)
    
    // Let's use the viewport to project to standard pixel coordinates
    // Note: item.width/height are already scaled if we use viewport.width/height?
    // Actually item.width is in PDF units.
    
    // Simple approach: use the transform directly but flip Y
    // x = tx[4], y = viewport.height - tx[5] (roughly)
    // Better: use the viewport projection if available, but here we are in a worker/pure function
    // We'll assume viewport.height is available.
    
    const x = tx[4];
    const y = viewport.height - tx[5]; // Flip Y to top-left origin

    return {
      str: item.str,
      x,
      y, // Top-left based Y (approximate baseline)
      width: item.width,
      height: item.height || fontSize, // Fallback if height missing
      fontSize,
      fontName: item.fontName,
      dir: item.dir,
      rotation: rotationDeg,
      transform: tx,
      color: '#000000' // Default, as color extraction is complex in PDF.js textContent
    };
  });
}

/**
 * Step 1: Group runs into lines based on Y-coordinate
 */
export function groupRunsIntoLines(runs: TextRunRaw[], stats?: PageStats): TextLine[] {
  const yTolerance = stats ? stats.dominantFontSize * 0.5 : DEFAULT_Y_TOLERANCE;

  // Sort by Y (top to bottom), then X (left to right)
  const sorted = [...runs].sort((a, b) => {
    if (Math.abs(a.y - b.y) <= yTolerance) {
      return a.x - b.x;
    }
    return a.y - b.y;
  });

  const lines: TextLine[] = [];
  let currentLine: TextRunRaw[] = [];
  let currentY: number | null = null;

  for (const run of sorted) {
    // Skip empty strings
    if (!run.str.trim()) continue;

    if (currentY === null) {
      currentLine = [run];
      currentY = run.y;
    } else if (Math.abs(run.y - currentY) <= yTolerance) {
      currentLine.push(run);
    } else {
      // New line
      if (currentLine.length > 0) {
        lines.push(createLineFromRuns(currentLine));
      }
      currentLine = [run];
      currentY = run.y;
    }
  }
  
  if (currentLine.length > 0) {
    lines.push(createLineFromRuns(currentLine));
  }

  return lines;
}

function createLineFromRuns(runs: TextRunRaw[]): TextLine {
  // Sort runs by X just in case
  runs.sort((a, b) => a.x - b.x);
  
  const first = runs[0];
  const last = runs[runs.length - 1];
  
  // Average Y
  const avgY = runs.reduce((sum, r) => sum + r.y, 0) / runs.length;
  
  // Max height in line
  const maxHeight = Math.max(...runs.map(r => r.height));

  return {
    runs,
    y: avgY,
    xStart: first.x,
    xEnd: last.x + last.width,
    height: maxHeight
  };
}

/**
 * Step 2: Detect columns
 * Simple 1D clustering on xStart
 */
export function detectColumns(lines: TextLine[], pageWidth: number): TextLine[] {
  // If no lines, return
  if (lines.length === 0) return lines;

  // 1. Identify potential column starts
  // We look for significant gaps in the x-projection of text
  // For now, a simpler approach:
  // Cluster lines by their xStart.
  
  // Sort lines by xStart to find clusters
  const xSorted = [...lines].sort((a, b) => a.xStart - b.xStart);
  
  // Naive column assignment:
  // If a line starts significantly to the right of the previous cluster, it's a new column?
  // This is tricky because indentation exists.
  
  // Better approach:
  // Check for vertical overlap. If two blocks of text don't overlap horizontally, they are columns.
  // But we are processing line by line.
  
  // Let's stick to the plan: assign columnIndex based on xStart clusters.
  // We'll use a simple threshold.
  
  // Find "centers" of columns
  // This is a hard problem to solve perfectly without global analysis.
  // Let's try a simple heuristic:
  // Split page into left/right halves if we see text starting past 45% of width?
  
  // For V1, let's assume single column unless we detect a clear split.
  // We'll assign columnIndex = 0 for everyone for now to be safe, 
  // unless we implement the full projection profile.
  
  // TODO: Implement robust column detection
  lines.forEach(l => l.columnIndex = 0);
  
  return lines;
}

/**
 * Step 2.5: Detect Tables
 * Identifies groups of lines that look like tables and extracts them.
 */
export function detectTables(lines: TextLine[], pageDims: { width: number, height: number }, stats?: PageStats): { tables: TableBlock[], remainingLines: TextLine[] } {
  const tables: TableBlock[] = [];
  const remainingLines: TextLine[] = [];
  
  const colGapThreshold = stats ? stats.dominantFontSize * 1.5 : DEFAULT_COL_GAP_THRESHOLD;
  const xAlignTolerance = stats ? stats.dominantFontSize * 0.8 : DEFAULT_X_ALIGN_TOLERANCE;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    
    // Heuristic: A table row usually has multiple distinct text runs separated by gaps
    // We check if this line has > 1 run and if those runs are spaced out
    // This is a very naive check. A better one would check for vertical alignment with next lines.
    
    const isPotentialTableRow = (l: TextLine) => {
      if (l.runs.length < 2) return false;
      // Check for gaps
      // We need to sort runs by X first (already done in createLineFromRuns)
      let maxGap = 0;
      for (let j = 0; j < l.runs.length - 1; j++) {
        const gap = l.runs[j+1].x - (l.runs[j].x + l.runs[j].width);
        if (gap > colGapThreshold) return true;
      }
      return false;
    };

    if (isPotentialTableRow(line)) {
      // Look ahead to see if subsequent lines also look like table rows
      // and if they align vertically (share similar column starts)
      const tableLines: TextLine[] = [line];
      let j = i + 1;
      
      while (j < lines.length) {
        const nextLine = lines[j];
        
        // Break if vertical gap is too large (end of table)
        if (nextLine.y - lines[j-1].y > lines[j-1].height * 2.5) break;
        
        // Check for "Note:" or similar keywords that indicate end of table
        const firstRunStr = nextLine.runs[0]?.str.trim().toLowerCase() || '';
        const isNote = firstRunStr.startsWith('note:') || firstRunStr.startsWith('source:') || firstRunStr.startsWith('remark:');
        
        if (isNote) break;
        
        // If it looks like a row, add it
        // Even if it has 1 run, it might be a cell in a table (e.g. total)
        // But for now let's require structure or alignment
        
        // Check alignment with previous row
        // Simple check: does at least one run start at similar X as a run in previous row?
        const hasAlignment = nextLine.runs.some(r => 
          tableLines.some(tl => tl.runs.some(tr => Math.abs(tr.x - r.x) < xAlignTolerance))
        );
        
        if (hasAlignment || isPotentialTableRow(nextLine)) {
          tableLines.push(nextLine);
          j++;
        } else {
          break;
        }
      }
      
      // If we found enough lines to constitute a table (e.g. >= 2)
      if (tableLines.length >= 2) {
        // Create Table Block
        const tableBlock = createTableBlock(tableLines, pageDims, stats);
        tables.push(tableBlock);
        i = j; // Skip processed lines
        continue;
      }
    }
    
    remainingLines.push(line);
    i++;
  }
  
  return { tables, remainingLines };
}

function createTableBlock(lines: TextLine[], pageDims: { width: number, height: number }, stats?: PageStats): TableBlock {
  // Calculate bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  lines.forEach(l => {
    minX = Math.min(minX, l.xStart);
    minY = Math.min(minY, l.y - l.height); // Top
    maxX = Math.max(maxX, l.xEnd);
    maxY = Math.max(maxY, l.y + l.height); // Bottom (approx)
  });

  // Add padding to the table box to ensure we cover background artifacts
  const paddingX = 15;
  const paddingY = 10;
  
  minX = Math.max(0, minX - paddingX);
  maxX = Math.min(pageDims.width, maxX + paddingX);
  minY = Math.max(0, minY - paddingY);
  maxY = Math.min(pageDims.height, maxY + paddingY);
  
  // Convert to %
  const box: [number, number, number, number] = [
    (minX / pageDims.width) * 100,
    (minY / pageDims.height) * 100,
    ((maxX - minX) / pageDims.width) * 100,
    ((maxY - minY) / pageDims.height) * 100
  ];

  // Identify Columns (Global Grid Inference)
  // Use a projection profile to find vertical gaps across the most populated rows
  
  // 1. Filter for "dense" rows to avoid headers skewing the column detection
  const maxRuns = Math.max(...lines.map(l => l.runs.length));
  const denseLines = lines.filter(l => l.runs.length >= Math.max(1, maxRuns - 2));
  
  // 2. Build Projection Profile
  // We map the X-axis relative to minX
  const widthInt = Math.ceil(maxX - minX);
  const profile = new Int8Array(widthInt).fill(0);
  
  denseLines.forEach(line => {
    line.runs.forEach(run => {
      const start = Math.max(0, Math.floor(run.x - minX));
      const end = Math.min(widthInt, Math.ceil(run.x + run.width - minX));
      for (let i = start; i < end; i++) {
        profile[i] = 1;
      }
    });
  });
  
  // 3. Find Gaps (sequences of 0s)
  const columnBoundaries: number[] = [minX];
  let inGap = false;
  let gapStart = 0;
  
  const minGapWidth = stats ? stats.dominantFontSize * 0.2 : 2;

  // Scan profile
  for (let i = 0; i < widthInt; i++) {
    const isText = profile[i] === 1;
    
    if (!isText && !inGap) {
      inGap = true;
      gapStart = i;
    } else if (isText && inGap) {
      inGap = false;
      // Gap ended at i. Gap center is (gapStart + i) / 2
      // Only count gaps that are significant? (e.g. > 2px)
      if (i - gapStart > minGapWidth) {
         const center = minX + (gapStart + i) / 2;
         columnBoundaries.push(center);
      }
    }
  }
  columnBoundaries.push(maxX);
  
  // Ensure boundaries are sorted
  columnBoundaries.sort((a, b) => a - b);

  // Create Rows
  // Sort lines by Y (Top to Bottom) to ensure correct vertical ordering
  const sortedLines = [...lines].sort((a, b) => a.y - b.y);

  // Cluster lines into logical rows based on vertical proximity
  const logicalRows: TextLine[][] = [];
  if (sortedLines.length > 0) {
    let currentRow: TextLine[] = [sortedLines[0]];
    
    for (let i = 1; i < sortedLines.length; i++) {
      const line = sortedLines[i];
      const prevLine = currentRow[currentRow.length - 1];
      
      // Calculate vertical gap
      const baselineDist = line.y - prevLine.y;
      const avgHeight = (line.height + prevLine.height) / 2;
      
      // Heuristic: Merge if baseline distance is small (< 0.5 * height)
      // Reduced from 1.3 to 0.5 to prevent merging of separate rows (e.g. Header vs Data)
      // This might split wrapped text into separate rows, but that is safer than merging distinct data rows.
      // Use dynamic threshold if available
      const mergeThreshold = stats ? 0.8 : 1.0; // Slightly stricter if we have stats? Or looser?
      // Actually, 1.0 * avgHeight is what it was.
      
      if (baselineDist < avgHeight * mergeThreshold) {
        currentRow.push(line);
      } else {
        logicalRows.push(currentRow);
        currentRow = [line];
      }
    }
    logicalRows.push(currentRow);
  }

  const rows: TableRow[] = logicalRows.map((rowLines, rowIndex) => {
    // Collect all runs from all lines in this row
    const allRuns = rowLines.flatMap(l => l.runs);
    const sortedRuns = [...allRuns].sort((a, b) => a.x - b.x);
    
    // Determine row vertical bounds
    const rowTopY = Math.min(...rowLines.map(l => l.y - l.height));
    const rowBottomY = Math.max(...rowLines.map(l => l.y));
    
    // Map runs to columns
    // We have N columns defined by N+1 boundaries
    const cells: TableCell[] = [];
    
    for (let i = 0; i < columnBoundaries.length - 1; i++) {
      const colStart = columnBoundaries[i];
      const colEnd = columnBoundaries[i+1];
      const colWidth = colEnd - colStart;
      
      // Find runs that belong to this column
      // Handle split runs (runs that span multiple columns)
      const colRuns: { str: string, style: any, y: number, x: number }[] = [];
      
      sortedRuns.forEach(run => {
         const runStart = run.x;
         const runEnd = run.x + run.width;
         
         // Quick check: disjoint
         if (runEnd <= colStart || runStart >= colEnd) return;
         
         // Overlap exists
         if (runStart >= colStart && runEnd <= colEnd) {
            // Full inclusion
            colRuns.push({ str: run.str, style: run, y: run.y, x: run.x });
         } else {
            // Partial inclusion - Split text
            const charWidth = run.width / Math.max(1, run.str.length);
            let includedText = '';
            let firstCharX = -1;
            
            for (let k = 0; k < run.str.length; k++) {
               const charCenter = run.x + (k * charWidth) + (charWidth / 2);
               if (charCenter >= colStart && charCenter < colEnd) {
                  if (firstCharX === -1) firstCharX = run.x + (k * charWidth);
                  includedText += run.str[k];
               }
            }
            
            if (includedText) {
               colRuns.push({ str: includedText, style: run, y: run.y, x: firstCharX });
            }
         }
      });
      
      let content = '';
      let styles = {};
      
      if (colRuns.length > 0) {
        // Sort by Y then X to handle wrapped text correctly
        colRuns.sort((a, b) => {
            // Use style.height for tolerance
            if (Math.abs(a.y - b.y) > a.style.height * 0.5) return a.y - b.y;
            return a.x - b.x;
        });
        
        content = colRuns.map(r => r.str).join(' ');
        // Use style of first run
        const r = colRuns[0].style;
        styles = {
          fontSize: r.fontSize,
          fontFamily: r.fontName,
          fontWeight: r.fontName.toLowerCase().includes('bold') ? 700 : 400,
          color: r.color || '#000000',
          italic: r.fontName.toLowerCase().includes('italic'),
        };
      }
      
      // Vertical Expansion
      let cellTop = rowTopY;
      let cellHeight = rowBottomY - rowTopY;
      
      // Ensure minimum height
      if (cellHeight < 10) cellHeight = 10;

      // Expand Top
      if (rowIndex === 0) {
         const diff = cellTop - minY;
         cellTop -= diff;
         cellHeight += diff;
      } else {
         const prevRowLines = logicalRows[rowIndex - 1];
         const prevBottom = Math.max(...prevRowLines.map(l => l.y));
         const gap = cellTop - prevBottom;
         if (gap > 0) {
             cellTop -= (gap / 2);
             cellHeight += (gap / 2);
         }
      }
      
      // Expand Bottom
      if (rowIndex === logicalRows.length - 1) {
          const diff = maxY - (cellTop + cellHeight);
          cellHeight += diff;
      } else {
          const nextRowLines = logicalRows[rowIndex + 1];
          const nextTop = Math.min(...nextRowLines.map(l => l.y - l.height));
          const currentBottom = rowBottomY;
          const gap = nextTop - currentBottom;
          if (gap > 0) {
              cellHeight += (gap / 2);
          }
      }

      // Calculate cell box in %
      const cellBox: [number, number, number, number] = [
        (colStart / pageDims.width) * 100,
        (cellTop / pageDims.height) * 100,
        (colWidth / pageDims.width) * 100,
        (cellHeight / pageDims.height) * 100
      ];

      cells.push({
        content,
        box: cellBox,
        width: (colWidth / (maxX - minX)) * 100,
        align: 'left',
        styles
      });
    }
    
    return {
      cells,
      height: rowBottomY - rowTopY
    };
  });

  return {
    id: `table-${Date.now()}-${Math.random()}`,
    type: 'table',
    box,
    rows
  };
}

/**
 * Step 3: Group lines into paragraphs
 */
export function groupLinesIntoParagraphs(lines: TextLine[], stats?: PageStats): TextParagraph[] {
  // Sort by Y again to be sure
  lines.sort((a, b) => a.y - b.y);

  const paragraphs: TextParagraph[] = [];
  let currentParaLines: TextLine[] = [];
  
  // We need to track stats per column ideally
  // For now assuming single column or pre-sorted by column
  
  const breakRatio = stats ? (stats.dominantLineHeight / stats.dominantFontSize) * 1.5 : DEFAULT_PARAGRAPH_BREAK_RATIO;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (currentParaLines.length === 0) {
      currentParaLines.push(line);
      continue;
    }
    
    const prevLine = currentParaLines[currentParaLines.length - 1];
    
    // Check 1: Same column?
    if (line.columnIndex !== prevLine.columnIndex) {
      paragraphs.push(createParagraph(currentParaLines));
      currentParaLines = [line];
      continue;
    }
    
    // Check 2: Vertical spacing
    const dy = line.y - prevLine.y;
    const lineHeight = Math.max(prevLine.height, line.height);
    
    // If gap is too large, new paragraph
    if (dy > lineHeight * breakRatio) {
      paragraphs.push(createParagraph(currentParaLines));
      currentParaLines = [line];
      continue;
    }
    
    // Check 3: Horizontal alignment (optional but good)
    // If line starts way to the left or right of previous, might be distinct
    // But indentation is valid in paragraphs.
    // Let's rely mostly on vertical spacing for now.
    
    currentParaLines.push(line);
  }
  
  if (currentParaLines.length > 0) {
    paragraphs.push(createParagraph(currentParaLines));
  }
  
  return paragraphs;
}

function createParagraph(lines: TextLine[]): TextParagraph {
  // Compute bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  lines.forEach(line => {
    minX = Math.min(minX, line.xStart);
    minY = Math.min(minY, line.y); // line.y is baseline-ish
    maxX = Math.max(maxX, line.xEnd);
    maxY = Math.max(maxY, line.y + line.height);
  });
  
  // Adjust minY to be top of first line
  // line.y is approx baseline, so top is y - fontSize?
  // We normalized y to be top-left based, but let's refine.
  // In normalizeTextItemsToRuns, we did y = viewport.height - tx[5].
  // tx[5] is baseline y in PDF. So y is baseline from top.
  // So top of line is y - fontSize.
  
  const firstLineHeight = lines[0].height;
  minY = lines[0].y - firstLineHeight; 

  return {
    lines,
    columnIndex: lines[0].columnIndex || 0,
    boundingBox: {
      x: minX,
      y: minY,
      w: maxX - minX,
      h: maxY - minY
    }
  };
}

function variance(nums: number[]) {
  if (nums.length <= 1) return 0;
  const avg = nums.reduce((a,b)=>a+b,0)/nums.length;
  return nums.reduce((a,b)=>a + Math.pow(b-avg, 2), 0) / nums.length;
}

function detectAlignment(lines: TextLine[], pageDims: { width: number, height: number }): 'left' | 'center' | 'right' | 'justify' {
  if (lines.length === 0) return 'left';
  
  // Calculate page center (assuming single column for now)
  // TODO: Use column bounds if available
  const pageCenter = pageDims.width / 2;
  
  // Check for Center Alignment
  // A line is centered if its midpoint is close to page center
  let centerCount = 0;
  lines.forEach(l => {
    const mid = l.xStart + (l.xEnd - l.xStart) / 2;
    if (Math.abs(mid - pageCenter) < 20) { // 20px tolerance
      centerCount++;
    }
  });
  
  if (centerCount > lines.length * 0.6) return 'center';
  
  // Check for Right Alignment vs Left vs Justify
  const xStarts = lines.map(l => l.xStart);
  const xEnds = lines.map(l => l.xEnd);
  
  const varStart = variance(xStarts);
  const varEnd = variance(xEnds);
  
  // Low variance means aligned
  const isLeftAligned = varStart < 20;
  const isRightAligned = varEnd < 20;
  
  if (isLeftAligned && isRightAligned && lines.length > 1) return 'justify';
  if (isRightAligned && !isLeftAligned) return 'right';
  
  return 'left'; // Default
}

function cleanFontName(fontName: string): string {
  // Remove subset prefix (e.g. ABCDEF+Verdana)
  let name = fontName;
  if (name.includes('+')) {
    name = name.split('+')[1];
  }
  
  // Remove common suffixes to get family name
  // We want to keep the family name clean
  const suffixes = ['-Bold', '-Italic', '-BoldItalic', 'Bold', 'Italic', 'Regular', 'MT', 'PS'];
  suffixes.forEach(s => {
    name = name.replace(new RegExp(s, 'g'), '');
  });
  
  name = name.replace(/-/g, ' ').trim();
  
  // Map to standard web fonts
  const lower = name.toLowerCase();
  if (lower.includes('arial')) return 'Arial, sans-serif';
  if (lower.includes('times')) return '"Times New Roman", Times, serif';
  if (lower.includes('courier')) return '"Courier New", Courier, monospace';
  if (lower.includes('helvetica')) return 'Helvetica, sans-serif';
  if (lower.includes('verdana')) return 'Verdana, sans-serif';
  if (lower.includes('georgia')) return 'Georgia, serif';
  if (lower.includes('tahoma')) return 'Tahoma, sans-serif';
  if (lower.includes('trebuchet')) return '"Trebuchet MS", sans-serif';
  if (lower.includes('calibri')) return 'Calibri, sans-serif';
  if (lower.includes('cambria')) return 'Cambria, serif';
  
  // Fallback: try to use the name, but ensure it's quoted if it has spaces
  return name.includes(' ') ? `"${name}", sans-serif` : `${name}, sans-serif`;
}

/**
 * Step 4: Convert paragraphs to TextBlocks
 */
export function paragraphsToBlocks(paragraphs: TextParagraph[], pageDims: { width: number, height: number }, stats?: PageStats): TextBlock[] {
  return paragraphs.map((para, index) => {
    const { x, y, w, h } = para.boundingBox;
    
    // Convert to % coordinates
    const box: [number, number, number, number] = [
      (x / pageDims.width) * 100,
      (y / pageDims.height) * 100,
      (w / pageDims.width) * 100,
      (h / pageDims.height) * 100
    ];
    
    // Construct HTML content
    const textContent = para.lines
      .map(l => l.runs.map(r => r.str).join(''))
      .join('\n'); 
      
    const firstRun = para.lines[0].runs[0];
    
    const dominantSize = stats ? stats.dominantFontSize : 11;
    const isHeader = firstRun.fontSize > (dominantSize * 1.2) || (firstRun.fontSize > dominantSize && firstRun.fontName.toLowerCase().includes('bold'));

    // Detect Alignment
    const align = detectAlignment(para.lines, pageDims);

    return {
      id: `block-${index}-${Date.now()}`,
      type: 'text',
      html: textContent,
      box,
      styles: {
        fontFamily: cleanFontName(firstRun.fontName),
        fontSize: firstRun.fontSize,
        fontWeight: firstRun.fontName.toLowerCase().includes('bold') ? 700 : 400,
        color: firstRun.color || '#000000',
        align: align,
        letterSpacing: 0,
        italic: firstRun.fontName.toLowerCase().includes('italic'),
        underline: false,
        lineHeight: null
      },
      meta: {
        isHeader,
        isListItem: textContent.trim().startsWith('•') || /^\d+\./.test(textContent.trim()),
        isCaption: false,
        rotation: firstRun.rotation,
        lineHeightRatio: 1.2,
        columnIndex: para.columnIndex,
        sourceRuns: para.lines.reduce((acc, l) => acc + l.runs.length, 0)
      }
    };
  });
}
