/**
 * Semantic Extractor
 * 
 * Converts HydratedPage blocks into a SemanticDocument with Typst source code.
 * This is the core of Phase 1: transforming coordinate-based extraction
 * into semantic representation.
 */

import type { HydratedPage, HydratedDocument, TextBlock, ImageBlock, TableBlock } from '@/types/hydration';
import type {
    SemanticDocument,
    SemanticSection,
    DocumentStructure,
    DocumentMetadata,
    PageInfo,
    SectionType,
    SectionStyles,
    ExtractorConfig,
    TypstGenerationResult,
} from './types';
import { DEFAULT_EXTRACTOR_CONFIG } from './types';
import {
    escapeTypst,
    typstHeading,
    typstStyledText,
    typstPlace,
    typstPageSetup,
    typstListItem,
    typstAlign,
    typstDocumentPreamble,
    generateSectionId,
    cssColorToTypst,
    mapFontFamily,
} from './typst-utils';
import { generateTypstSource } from './generator';

// ============================================================================
// Main Extractor Function
// ============================================================================

/**
 * Extract semantic structure from a hydrated document and generate Typst source.
 */
export function extractSemanticDocument(
    hydratedDoc: HydratedDocument,
    config: Partial<ExtractorConfig> = {}
): SemanticDocument {
    const mergedConfig = { ...DEFAULT_EXTRACTOR_CONFIG, ...config };

    // Extract page info
    const pageInfo: PageInfo[] = hydratedDoc.pages.map((p, i) => ({
        pageIndex: i,
        width: p.dims.width,
        height: p.dims.height,
    }));

    // Detect document-wide typography
    const metadata = detectDocumentMetadata(hydratedDoc);

    // Extract sections from all pages
    const allSections: SemanticSection[] = [];

    for (const page of hydratedDoc.pages) {
        const pageSections = extractPageSections(page, metadata, mergedConfig);
        allSections.push(...pageSections);
    }

    // Build section index
    const sectionIndex = new Map<string, SemanticSection>();
    const indexSections = (sections: SemanticSection[]) => {
        for (const section of sections) {
            sectionIndex.set(section.id, section);
            if (section.children) {
                indexSections(section.children);
            }
        }
    };
    indexSections(allSections);

    // Generate Typst source
    const typstResult = generateTypstSource(allSections, pageInfo, metadata, mergedConfig);

    return {
        typstSource: typstResult.source,
        structure: {
            sections: allSections,
            sectionIndex,
        },
        pageInfo,
        metadata,
    };
}

// ============================================================================
// Metadata Detection
// ============================================================================

/**
 * Detect document-wide metadata from all pages
 */
function detectDocumentMetadata(doc: HydratedDocument): DocumentMetadata {
    let bodyFontSize = 11;
    let maxFontSize = 11;

    // Analyze all text blocks to find common font sizes
    const fontSizes: number[] = [];

    for (const page of doc.pages) {
        for (const block of page.blocks) {
            if (block.type === 'text') {
                const textBlock = block as TextBlock;
                fontSizes.push(textBlock.styles.fontSize);
                maxFontSize = Math.max(maxFontSize, textBlock.styles.fontSize);
            }
        }
    }

    // Most common font size is body text
    if (fontSizes.length > 0) {
        const sorted = [...fontSizes].sort((a, b) => a - b);
        bodyFontSize = sorted[Math.floor(sorted.length / 2)]; // Median
    }

    return {
        createdAt: doc.source.createdAt,
        pageCount: doc.pages.length,
        typography: {
            bodyFontSize,
            headingScale: maxFontSize / bodyFontSize,
            lineHeight: 1.2,
        },
    };
}

// ============================================================================
// Section Extraction
// ============================================================================

/**
 * Extract semantic sections from a single page
 */
function extractPageSections(
    page: HydratedPage,
    metadata: DocumentMetadata,
    config: ExtractorConfig
): SemanticSection[] {
    const sections: SemanticSection[] = [];

    // Sort blocks by reading order (top to bottom, left to right)
    const sortedBlocks = [...page.blocks].sort((a, b) => {
        const [, yA] = a.box;
        const [xA] = a.box;
        const [, yB] = b.box;
        const [xB] = b.box;

        // Primary sort by Y (top to bottom)
        if (Math.abs(yA - yB) > 2) {
            return yA - yB;
        }
        // Secondary sort by X (left to right)
        return xA - xB;
    });

    // Group blocks into sections
    let currentListItems: SemanticSection[] = [];

    for (const block of sortedBlocks) {
        if (block.type === 'text') {
            const textBlock = block as TextBlock;
            const section = textBlockToSection(textBlock, page, metadata, config);

            // Group consecutive list items
            if (section.type === 'list-item') {
                currentListItems.push(section);
            } else {
                // Flush any accumulated list items
                if (currentListItems.length > 0) {
                    sections.push(createListSection(currentListItems, page.pageIndex));
                    currentListItems = [];
                }
                sections.push(section);
            }
        } else if (block.type === 'image') {
            // Flush list items before image
            if (currentListItems.length > 0) {
                sections.push(createListSection(currentListItems, page.pageIndex));
                currentListItems = [];
            }
            sections.push(imageBlockToSection(block as ImageBlock, page));
        } else if (block.type === 'table') {
            // Flush list items before table
            if (currentListItems.length > 0) {
                sections.push(createListSection(currentListItems, page.pageIndex));
                currentListItems = [];
            }
            sections.push(tableBlockToSection(block as TableBlock, page));
        }
    }

    // Flush remaining list items
    if (currentListItems.length > 0) {
        sections.push(createListSection(currentListItems, page.pageIndex));
    }

    return sections;
}

/**
 * Convert a TextBlock to a SemanticSection
 */
function textBlockToSection(
    block: TextBlock,
    page: HydratedPage,
    metadata: DocumentMetadata,
    config: ExtractorConfig
): SemanticSection {
    // Extract plain text from HTML
    const plainText = stripHtml(block.html).trim();

    // Determine section type
    let type: SectionType = 'paragraph';
    let level: number | undefined;
    let confidence = 0.8;

    if (block.meta.isHeader) {
        type = 'heading';
        level = detectHeadingLevel(block, metadata);
        confidence = 0.9;
    } else if (block.meta.isListItem) {
        type = 'list-item';
        confidence = 0.85;
    }

    // Generate Typst content based on type
    let typstContent: string;

    if (type === 'heading' && level) {
        // Use bold text at original size instead of Typst heading syntax
        // (Typst headings add huge default spacing)
        const fontSize = block.styles.fontSize || 12;
        // Add vertical space before section headings for visual separation
        typstContent = `#v(0.6em)\n#text(size: ${fontSize}pt, weight: "bold")[${escapeTypst(plainText)}]`;
    } else if (type === 'list-item') {
        // Remove list markers from content
        const cleanContent = plainText.replace(/^[\u2022\u2023\u25E6\u2043\-\*]\s*/, '');
        typstContent = typstListItem(cleanContent);
    } else {
        // Regular paragraph - apply styling with original font size
        typstContent = generateStyledParagraph(plainText, block.styles);
    }

    return {
        id: generateSectionId(type),
        type,
        level,
        content: plainText,
        typstContent,
        styles: blockStylesToSectionStyles(block.styles),
        pageIndex: page.pageIndex,
        originalBox: config.preserveOriginalCoordinates ? block.box : undefined,
        meta: {
            confidence,
            source: 'heuristic',
            columnIndex: block.meta.columnIndex,
            sourceRunCount: block.meta.sourceRuns,
        },
    };
}

/**
 * Create a list section from accumulated list items
 */
function createListSection(items: SemanticSection[], pageIndex: number): SemanticSection {
    const typstContent = items.map(item => item.typstContent).join('\n');

    return {
        id: generateSectionId('list'),
        type: 'list',
        content: items.map(item => item.content).join('\n'),
        typstContent,
        styles: items[0]?.styles || {},
        pageIndex,
        children: items,
        meta: {
            confidence: 0.85,
            source: 'heuristic',
            columnIndex: items[0]?.meta.columnIndex || 0,
            sourceRunCount: items.reduce((sum, item) => sum + item.meta.sourceRunCount, 0),
        },
    };
}

/**
 * Convert an ImageBlock to a SemanticSection
 */
function imageBlockToSection(block: ImageBlock, page: HydratedPage): SemanticSection {
    const [xPct, yPct, wPct, hPct] = block.box;
    const width = (wPct / 100) * page.dims.width;
    const height = (hPct / 100) * page.dims.height;

    // For now, we'll use a placeholder - actual image embedding requires more work
    const typstContent = `#box(width: ${width.toFixed(1)}pt, height: ${height.toFixed(1)}pt, fill: luma(240))[Image]`;

    return {
        id: generateSectionId('image'),
        type: 'image',
        content: '[Image]',
        typstContent,
        styles: {},
        pageIndex: page.pageIndex,
        originalBox: block.box,
        meta: {
            confidence: 1.0,
            source: 'heuristic',
            columnIndex: 0,
            sourceRunCount: 1,
        },
    };
}

/**
 * Convert a TableBlock to a SemanticSection
 */
function tableBlockToSection(block: TableBlock, page: HydratedPage): SemanticSection {
    // Generate Typst table
    const columnCount = block.rows[0]?.cells.length || 1;
    const columns = Array(columnCount).fill('auto').join(', ');

    let tableContent = `#table(\n  columns: (${columns}),\n`;

    for (const row of block.rows) {
        for (const cell of row.cells) {
            const cellText = escapeTypst(cell.content);
            tableContent += `  [${cellText}],\n`;
        }
    }

    tableContent += ')';

    return {
        id: generateSectionId('table'),
        type: 'table',
        content: block.rows.map(r => r.cells.map(c => c.content).join('\t')).join('\n'),
        typstContent: tableContent,
        styles: {},
        pageIndex: page.pageIndex,
        originalBox: block.box,
        meta: {
            confidence: 0.9,
            source: 'heuristic',
            columnIndex: 0,
            sourceRunCount: block.rows.reduce((sum, r) => sum + r.cells.length, 0),
        },
    };
}

// ============================================================================
// Typst Generation
// ============================================================================

// generateTypstSource has been moved to generator.ts

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Strip HTML tags from content
 */
function stripHtml(html: string): string {
    // Create a temporary element to parse HTML
    if (typeof document !== 'undefined') {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || '';
    }
    // Fallback for non-browser environments
    return html.replace(/<[^>]*>/g, '');
}

/**
 * Detect heading level based on font size relative to body text
 */
function detectHeadingLevel(block: TextBlock, metadata: DocumentMetadata): number {
    const ratio = block.styles.fontSize / metadata.typography.bodyFontSize;

    // Detected headers with body size = bold labels (Level 4/5)
    // Large headers = Level 1-3
    if (ratio >= 2.0) return 1;
    if (ratio >= 1.5) return 2;
    if (ratio >= 1.25) return 3;

    // If it's a header but small, treat as level 4 or 5
    if (ratio >= 1.1) return 4;
    return 5;
}

/**
 * Convert block styles to section styles
 */
function blockStylesToSectionStyles(styles: TextBlock['styles']): Partial<SectionStyles> {
    return {
        fontSize: styles.fontSize,
        fontFamily: styles.fontFamily,
        fontWeight: styles.fontWeight,
        color: styles.color,
        align: styles.align,
        italic: styles.italic,
        underline: styles.underline,
    };
}

/**
 * Generate styled paragraph with Typst formatting
 * Now includes original font size to match PDF layout
 */
function generateStyledParagraph(text: string, styles: TextBlock['styles']): string {
    const hasNonDefaultStyles =
        styles.fontWeight >= 600 ||
        styles.italic ||
        styles.underline ||
        (styles.color && styles.color !== '#000000') ||
        styles.align !== 'left' ||
        (styles.fontSize && styles.fontSize !== 10);

    if (!hasNonDefaultStyles) {
        return escapeTypst(text);
    }

    let content = typstStyledText(text, {
        fontSize: styles.fontSize,
        fontWeight: styles.fontWeight,
        color: styles.color,
        italic: styles.italic,
        underline: styles.underline,
    });

    if (styles.align !== 'left') {
        content = typstAlign(styles.align, content);
    }

    return content;
}

// ============================================================================
// Export for Testing
// ============================================================================

export {
    detectDocumentMetadata,
    extractPageSections,
    textBlockToSection,
    generateTypstSource,
    stripHtml,
    detectHeadingLevel,
};
