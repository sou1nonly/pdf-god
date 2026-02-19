/**
 * Semantic Generator
 * 
 * Converts SemanticSection tree back into Typst source code.
 * Includes stable identifiers as comments to enable two-way sync.
 */

import { SemanticSection, PageInfo, DocumentMetadata, ExtractorConfig, TypstGenerationResult } from './types';
import {
    typstDocumentPreamble,
    typstPageSetup,
    typstHeading,
    typstStyledText,
    typstListItem,
    typstAlign,
    escapeTypst
} from './typst-utils';

/**
 * Generate complete Typst source from semantic sections
 */
export function generateTypstSource(
    sections: SemanticSection[],
    pageInfo: PageInfo[],
    metadata: DocumentMetadata,
    config: ExtractorConfig
): TypstGenerationResult {
    const warnings: string[] = [];
    let usedAbsolutePositioning = false;
    const lines: string[] = [];

    // Add preamble
    lines.push(typstDocumentPreamble(metadata));

    // Group sections by page
    const sectionsByPage = new Map<number, SemanticSection[]>();
    for (const section of sections) {
        const pageSections = sectionsByPage.get(section.pageIndex) || [];
        pageSections.push(section);
        sectionsByPage.set(section.pageIndex, pageSections);
    }

    // Generate content for each page
    for (let pageIdx = 0; pageIdx < pageInfo.length; pageIdx++) {
        const page = pageInfo[pageIdx];
        const pageSections = sectionsByPage.get(pageIdx) || [];

        // Page setup (only if dimensions differ from default or first page)
        if (pageIdx === 0) {
            lines.push(typstPageSetup(page.width, page.height, { top: 36, bottom: 36, left: 40, right: 40 }));
            lines.push('');
        }

        // Page break for subsequent pages
        if (pageIdx > 0) {
            lines.push('#pagebreak()');
            lines.push('');
        }

        // Add sections for this page
        for (const section of pageSections) {
            // Skip children (they're included in parent's typstContent or handled during generation)
            if (section.type === 'list-item') continue;

            // Add stable identifier component
            lines.push(`// id: ${section.id}`);

            // Generate content
            lines.push(section.typstContent);
            lines.push('');  // Blank line between sections
        }
    }

    return {
        source: lines.join('\n'),
        warnings,
        stats: {
            sectionCount: sections.length,
            pageCount: pageInfo.length,
            usedAbsolutePositioning,
        },
    };
}
