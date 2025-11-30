import { HydratedPage, TextBlock } from '@/types/hydration';

/**
 * Strip HTML tags and decode entities
 */
function stripHtml(html: string): string {
  // Create a temporary element to decode HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || '';
}

/**
 * Extract all text content from hydrated pages
 */
export function extractTextFromPages(pages: HydratedPage[]): string {
  const textParts: string[] = [];

  for (const page of pages) {
    // Add page separator
    if (textParts.length > 0) {
      textParts.push(`\n--- Page ${page.pageIndex + 1} ---\n`);
    }

    // Extract text from blocks
    for (const block of page.blocks) {
      if (block.type === 'text') {
        const textBlock = block as TextBlock;
        textParts.push(stripHtml(textBlock.html));
      }
    }
  }

  return textParts.join('\n').trim();
}

/**
 * Extract text from a specific page
 */
export function extractTextFromPage(page: HydratedPage): string {
  return page.blocks
    .filter(block => block.type === 'text')
    .map(block => stripHtml((block as TextBlock).html))
    .join('\n')
    .trim();
}

/**
 * Split text into chunks for processing
 */
export function splitIntoChunks(text: string, wordsPerChunk: number = 500): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk).join(' '));
  }

  return chunks;
}

/**
 * Get document statistics
 */
export function getDocumentStats(pages: HydratedPage[]): {
  pageCount: number;
  wordCount: number;
  characterCount: number;
  blockCount: number;
} {
  let wordCount = 0;
  let characterCount = 0;
  let blockCount = 0;

  for (const page of pages) {
    for (const block of page.blocks) {
      blockCount++;
      if (block.type === 'text') {
        const textBlock = block as TextBlock;
        const text = stripHtml(textBlock.html);
        characterCount += text.length;
        wordCount += text.split(/\s+/).filter(w => w.length > 0).length;
      }
    }
  }

  return {
    pageCount: pages.length,
    wordCount,
    characterCount,
    blockCount
  };
}
