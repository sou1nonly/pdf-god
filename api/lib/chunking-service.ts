/**
 * Chunking Service
 * Splits documents into semantic chunks for embedding
 * Uses recursive character splitting to preserve context
 */

export interface Chunk {
    content: string;
    index: number;
    startChar: number;
    endChar: number;
    tokenCount: number;
    pageNumber?: number;
}

// Optimized settings based on RAG research
const CHUNK_SIZE = 1200;        // ~300-400 tokens
const CHUNK_OVERLAP = 240;      // 20% overlap
const MIN_CHUNK_SIZE = 100;     // Minimum chunk size

// Separators in order of preference (try to preserve semantic boundaries)
const SEPARATORS = [
    '\n\n',     // Paragraph breaks
    '\n',       // Line breaks
    '. ',       // Sentence endings
    '! ',       // Exclamations
    '? ',       // Questions
    '; ',       // Semicolons
    ', ',       // Commas
    ' ',        // Words
    ''          // Characters (last resort)
];

/**
 * Split text into chunks using recursive character splitting
 * Preserves semantic boundaries (paragraphs, sentences) when possible
 */
export function chunkDocument(text: string, totalPages?: number): Chunk[] {
    const chunks: Chunk[] = [];

    // Clean the text
    const cleanedText = text
        .replace(/\r\n/g, '\n')
        .replace(/\s+/g, ' ')
        .trim();

    if (!cleanedText) {
        return [];
    }

    // Split recursively
    const rawChunks = recursiveSplit(cleanedText, SEPARATORS, CHUNK_SIZE);

    // Process chunks with overlap and metadata
    let currentPosition = 0;

    for (let i = 0; i < rawChunks.length; i++) {
        let chunkContent = rawChunks[i].trim();

        if (chunkContent.length < MIN_CHUNK_SIZE && i < rawChunks.length - 1) {
            // Merge small chunks with next
            continue;
        }

        // Add overlap from previous chunk for context
        if (i > 0 && CHUNK_OVERLAP > 0) {
            const prevChunk = rawChunks[i - 1];
            const overlapText = prevChunk.slice(-CHUNK_OVERLAP).trim();
            if (overlapText && !chunkContent.startsWith(overlapText)) {
                chunkContent = overlapText + ' ' + chunkContent;
            }
        }

        const startChar = Math.max(0, cleanedText.indexOf(rawChunks[i].slice(0, 50), currentPosition));
        const endChar = startChar + rawChunks[i].length;

        chunks.push({
            content: chunkContent,
            index: chunks.length,
            startChar,
            endChar,
            tokenCount: estimateTokens(chunkContent),
            pageNumber: totalPages
                ? estimatePageNumber(startChar, cleanedText.length, totalPages)
                : undefined
        });

        currentPosition = endChar;
    }

    return chunks;
}

/**
 * Recursively split text using separators
 */
function recursiveSplit(
    text: string,
    separators: string[],
    maxSize: number
): string[] {
    if (text.length <= maxSize) {
        return [text];
    }

    // Try each separator in order
    for (const separator of separators) {
        if (separator === '') {
            // Last resort: split by size
            return splitBySize(text, maxSize);
        }

        if (text.includes(separator)) {
            const parts = text.split(separator);
            const chunks: string[] = [];
            let currentChunk = '';

            for (const part of parts) {
                const testChunk = currentChunk
                    ? currentChunk + separator + part
                    : part;

                if (testChunk.length <= maxSize) {
                    currentChunk = testChunk;
                } else {
                    if (currentChunk) {
                        chunks.push(currentChunk);
                    }

                    if (part.length > maxSize) {
                        // Recursively split large parts
                        const subChunks = recursiveSplit(
                            part,
                            separators.slice(separators.indexOf(separator) + 1),
                            maxSize
                        );
                        chunks.push(...subChunks);
                        currentChunk = '';
                    } else {
                        currentChunk = part;
                    }
                }
            }

            if (currentChunk) {
                chunks.push(currentChunk);
            }

            if (chunks.length > 1) {
                return chunks;
            }
        }
    }

    // Fallback: split by size
    return splitBySize(text, maxSize);
}

/**
 * Split text by fixed size (last resort)
 */
function splitBySize(text: string, maxSize: number): string[] {
    const chunks: string[] = [];

    for (let i = 0; i < text.length; i += maxSize - CHUNK_OVERLAP) {
        chunks.push(text.slice(i, i + maxSize));
    }

    return chunks;
}

/**
 * Estimate token count (rough: 1 token ≈ 4 chars for English)
 */
function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

/**
 * Estimate page number from character position
 */
function estimatePageNumber(
    charPosition: number,
    totalChars: number,
    totalPages: number
): number {
    if (totalChars === 0 || totalPages === 0) return 1;
    const ratio = charPosition / totalChars;
    return Math.max(1, Math.min(totalPages, Math.floor(ratio * totalPages) + 1));
}
