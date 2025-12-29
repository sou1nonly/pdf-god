/**
 * AI API Service
 * Frontend API calls for AI features
 */

import { api } from '../client';
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
 * Chat with document content
 */
export const chat = async (
    message: string,
    documentText: string,
    history: ChatMessage[] = []
): Promise<ChatResponse> => {
    return api.post<ChatResponse>('/ai/chat', {
        message,
        documentText,
        history,
    });
};

/**
 * Summarize document
 */
export const summarize = async (
    documentText: string,
    length: AISummaryLength = 'brief'
): Promise<SummarizeResponse> => {
    return api.post<SummarizeResponse>('/ai/summarize', {
        documentText,
        length,
    });
};

/**
 * Rewrite text in different tones
 */
export const rewrite = async (
    text: string,
    tone: AIRewriteTone = 'formal'
): Promise<RewriteResponse> => {
    return api.post<RewriteResponse>('/ai/rewrite', {
        text,
        tone,
    });
};

/**
 * Generate questions about document
 */
export const generateQuestions = async (
    documentText: string,
    count: number = 5
): Promise<QuestionsResponse> => {
    return api.post<QuestionsResponse>('/ai/questions', {
        documentText,
        count,
    });
};

/**
 * Extract key information from document
 */
export const extractKeyInfo = async (
    documentText: string
): Promise<ExtractResponse> => {
    return api.post<ExtractResponse>('/ai/extract', {
        documentText,
    });
};

export const aiApi = {
    chat,
    summarize,
    rewrite,
    generateQuestions,
    extractKeyInfo,
};

export default aiApi;
