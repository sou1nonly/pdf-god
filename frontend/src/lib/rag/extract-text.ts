/**
 * Text Extraction Utility
 * Extracts text from hydrated pages for RAG indexing
 */

import type { HydratedPage } from '@/types/hydration';

/**
 * Extract all text content from hydrated pages
 * This uses the same data source as the hydration engine
 */
export function extractTextFromPages(pages: HydratedPage[]): string {
    return pages
        .map((page, pageIndex) => {
            const pageText = page.blocks
                .filter(block => block.type === 'text')
                .map(block => {
                    // Prefer plain text, fallback to stripping HTML
                    if ('text' in block && block.text) {
                        return block.text;
                    }
                    if ('html' in block && block.html) {
                        return block.html.replace(/<[^>]*>/g, '');
                    }
                    return '';
                })
                .filter(text => text.trim().length > 0)
                .join('\n');

            return pageText ? `[Page ${pageIndex + 1}]\n${pageText}` : '';
        })
        .filter(text => text.length > 0)
        .join('\n\n');
}

/**
 * Get total text length for validation
 */
export function getTextLength(pages: HydratedPage[]): number {
    return pages.reduce((total, page) => {
        return total + page.blocks
            .filter(block => block.type === 'text')
            .reduce((pageTotal, block) => {
                const text = ('text' in block ? block.text : '') ||
                    ('html' in block ? block.html?.replace(/<[^>]*>/g, '') : '') || '';
                return pageTotal + text.length;
            }, 0);
    }, 0);
}
