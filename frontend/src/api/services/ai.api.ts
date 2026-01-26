/**
 * AI API Service
 * Frontend AI calls - Uses client-side AI service (no backend needed)
 */

import { clientAI } from '@/lib/ai/client-ai-service';
import type { ChatMessage, AIKeyInfo, AISummaryLength, AIRewriteTone } from '@/types';

export interface ChatResponse {
    response: string;
    confidence?: number;
}

export interface SummarizeResponse {
    summary: string;
    wordCount: number;
}

export interface RewriteResponse {
    suggestions: string[];
}

export interface QuestionsResponse {
    questions: string[];
}

export interface ExtractResponse {
    keyInfo: AIKeyInfo;
}

/**
 * Chat with document content - Uses client-side AI
 */
export const chat = async (
    message: string,
    documentText: string,
    history: ChatMessage[] = []
): Promise<ChatResponse> => {
    const result = await clientAI.chat(message, documentText, history);
    return {
        response: result.answer,
        confidence: result.confidence,
    };
};

/**
 * Summarize document - Uses client-side AI
 */
export const summarize = async (
    documentText: string,
    length: AISummaryLength = 'brief'
): Promise<SummarizeResponse> => {
    const result = await clientAI.summarize(documentText, length);
    return {
        summary: result.summary,
        wordCount: result.wordCount,
    };
};

/**
 * Rewrite text in different tones - Uses client-side AI
 */
export const rewrite = async (
    text: string,
    tone: AIRewriteTone = 'formal'
): Promise<RewriteResponse> => {
    const result = await clientAI.rewrite(text, tone);
    return {
        suggestions: result.suggestions,
    };
};

/**
 * Generate questions about document - Uses client-side AI
 * Note: This is a simple implementation since the client AI doesn't have a dedicated questions model
 */
export const generateQuestions = async (
    documentText: string,
    count: number = 5
): Promise<QuestionsResponse> => {
    // Extract key sentences and turn them into questions
    const sentences = documentText.match(/[^.!?]+[.!?]+/g) || [documentText];

    // Pick diverse sentences from the document
    const pickedIndices = new Set<number>();
    const step = Math.max(1, Math.floor(sentences.length / count));

    for (let i = 0; i < sentences.length && pickedIndices.size < count; i += step) {
        pickedIndices.add(i);
    }

    // Convert sentences to questions
    const questions = Array.from(pickedIndices).map(idx => {
        const sentence = sentences[idx].trim();
        // Simple question generation: extract key concepts
        const words = sentence.split(/\s+/).filter(w => w.length > 4);
        if (words.length > 0) {
            const keyWord = words[Math.floor(words.length / 2)];
            return `What can you tell me about ${keyWord.toLowerCase().replace(/[.,!?]/g, '')}?`;
        }
        return `What is the main point of: "${sentence.slice(0, 50)}..."?`;
    });

    return { questions };
};

/**
 * Extract key information from document - Uses client-side AI
 * Note: Basic implementation using summarization
 */
export const extractKeyInfo = async (
    documentText: string
): Promise<ExtractResponse> => {
    // Get a brief summary as the main topic
    const summaryResult = await clientAI.summarize(documentText, 'brief');

    // Extract sentences that might contain key facts
    const sentences = documentText.match(/[^.!?]+[.!?]+/g) || [];
    const keyFacts = sentences
        .filter(s =>
            /\d+/.test(s) || // Contains numbers
            /important|key|main|significant|notable/i.test(s) // Contains key words
        )
        .slice(0, 5)
        .map(s => s.trim());

    return {
        keyInfo: {
            title: summaryResult.summary.split('.')[0] || 'Document',
            summary: summaryResult.summary,
            keyPoints: keyFacts.length > 0 ? keyFacts : [summaryResult.summary],
            entities: [],
            dates: [],
            numbers: [],
        },
    };
};

export const aiApi = {
    chat,
    summarize,
    rewrite,
    generateQuestions,
    extractKeyInfo,
};

export default aiApi;
