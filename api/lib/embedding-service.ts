/**
 * Embedding Service
 * Generates embeddings using Google Gemini API
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const EMBEDDING_MODEL = 'text-embedding-004';
const EMBEDDING_DIMENSION = 768;

export interface EmbeddingResult {
    embedding: number[];
    model: string;
}

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY not configured');
    }

    // Truncate text if too long (model has limits)
    const truncatedText = text.slice(0, 10000);

    const response = await fetch(
        `${GEMINI_API_URL}/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: `models/${EMBEDDING_MODEL}`,
                content: {
                    parts: [{ text: truncatedText }]
                }
            })
        }
    );

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Embedding API error: ${error}`);
    }

    const data = await response.json();

    if (!data.embedding?.values) {
        throw new Error('No embedding returned from API');
    }

    return data.embedding.values;
}

/**
 * Generate embeddings for multiple texts in batches
 */
export async function generateEmbeddings(
    texts: string[],
    onProgress?: (completed: number, total: number) => void
): Promise<number[][]> {
    const embeddings: number[][] = [];
    const batchSize = 5; // Process 5 at a time to avoid rate limits

    for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);

        const batchEmbeddings = await Promise.all(
            batch.map(text => generateEmbedding(text))
        );

        embeddings.push(...batchEmbeddings);

        if (onProgress) {
            onProgress(Math.min(i + batchSize, texts.length), texts.length);
        }

        // Small delay between batches to avoid rate limits
        if (i + batchSize < texts.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    return embeddings;
}

/**
 * Get embedding dimension for the current model
 */
export function getEmbeddingDimension(): number {
    return EMBEDDING_DIMENSION;
}
