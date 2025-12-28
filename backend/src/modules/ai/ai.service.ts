/**
 * AI Module - Service
 * Business logic for AI features using Google Gemini
 */

import { env } from '../../config/env';
import { ApiError } from '../../middleware/error.middleware';
import type { ChatMessage, AIKeyInfo, AISummaryLength, AIRewriteTone } from '@lamina/shared';

// Gemini API Configuration
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

interface GeminiResponse {
    candidates?: Array<{
        content?: {
            parts?: Array<{
                text?: string;
            }>;
        };
    }>;
    error?: {
        message: string;
    };
}

/**
 * Call Gemini API
 */
const callGemini = async (prompt: string, systemInstruction?: string): Promise<string> => {
    if (!env.gemini.apiKey) {
        throw ApiError.internal('Gemini API key not configured', 'AI_SERVICE_UNAVAILABLE');
    }

    const requestBody: any = {
        contents: [{
            parts: [{ text: prompt }]
        }],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
        },
    };

    if (systemInstruction) {
        requestBody.systemInstruction = {
            parts: [{ text: systemInstruction }]
        };
    }

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${env.gemini.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('Gemini API error:', error);

            if (response.status === 429) {
                throw ApiError.badRequest('AI rate limit exceeded. Please try again later.', 'AI_RATE_LIMITED');
            }

            throw ApiError.internal('AI service error', 'AI_SERVICE_UNAVAILABLE');
        }

        const data = await response.json() as GeminiResponse;
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw ApiError.internal('No response from AI', 'AI_SERVICE_UNAVAILABLE');
        }

        return text;
    } catch (error) {
        if (error instanceof ApiError) throw error;
        console.error('Gemini API call failed:', error);
        throw ApiError.internal('AI service unavailable', 'AI_SERVICE_UNAVAILABLE');
    }
};

/**
 * Chat with document content
 */
export const chat = async (
    message: string,
    documentText: string,
    history: ChatMessage[]
): Promise<{ response: string; confidence: number }> => {
    const systemInstruction = `You are an AI assistant helping users understand and work with PDF documents.
You have access to the following document content to answer questions:

--- DOCUMENT START ---
${documentText.slice(0, 25000)}
--- DOCUMENT END ---

Instructions:
- Answer questions based on the document content when relevant
- Be helpful, accurate, and concise
- If the question is not related to the document, you can still help with general questions
- Always be friendly and professional`;

    // Build conversation context
    let prompt = '';
    for (const msg of history.slice(-10)) {
        prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
    }
    prompt += `User: ${message}\nAssistant:`;

    const response = await callGemini(prompt, systemInstruction);

    return {
        response,
        confidence: 0.85,
    };
};

/**
 * Summarize document
 */
export const summarize = async (
    documentText: string,
    length: AISummaryLength
): Promise<{ summary: string; wordCount: number }> => {
    const wordLimit = length === 'brief' ? 150 : 400;

    const prompt = `Summarize the following document in approximately ${wordLimit} words.
Focus on the main points, key findings, and important conclusions.

Document:
${documentText.slice(0, 30000)}

Summary:`;

    const summary = await callGemini(prompt);
    const wordCount = summary.split(/\s+/).length;

    return { summary, wordCount };
};

/**
 * Rewrite text in different tones
 */
export const rewrite = async (
    text: string,
    tone: AIRewriteTone
): Promise<{ suggestions: string[] }> => {
    const toneDescriptions: Record<AIRewriteTone, string> = {
        formal: 'professional, formal, and business-appropriate',
        casual: 'friendly, conversational, and approachable',
        concise: 'brief, to-the-point, and efficient',
        detailed: 'comprehensive, thorough, and explanatory',
    };

    const prompt = `Rewrite the following text in a ${toneDescriptions[tone]} style.
Provide 3 different variations.

Original text:
"${text}"

Format your response as:
1. [First variation]
2. [Second variation]
3. [Third variation]`;

    const response = await callGemini(prompt);

    // Parse numbered suggestions
    const suggestions = response
        .split(/\d+\.\s+/)
        .filter(s => s.trim())
        .map(s => s.trim().replace(/^\[|\]$/g, ''))
        .slice(0, 3);

    return { suggestions };
};

/**
 * Generate questions about document
 */
export const generateQuestions = async (
    documentText: string,
    count: number
): Promise<{ questions: string[] }> => {
    const prompt = `Based on the following document, generate ${count} thoughtful questions that would help someone understand the content better.

Document:
${documentText.slice(0, 20000)}

Generate exactly ${count} questions, one per line:`;

    const response = await callGemini(prompt);

    const questions = response
        .split('\n')
        .map(q => q.replace(/^\d+[\.\)]\s*/, '').trim())
        .filter(q => q.length > 10 && q.endsWith('?'))
        .slice(0, count);

    return { questions };
};

/**
 * Extract key information from document
 */
export const extractKeyInfo = async (
    documentText: string
): Promise<{ keyInfo: AIKeyInfo }> => {
    const prompt = `Analyze the following document and extract key information.

Document:
${documentText.slice(0, 25000)}

Provide your response in this exact JSON format:
{
  "topics": ["topic1", "topic2", "topic3"],
  "keyPoints": ["key point 1", "key point 2", "key point 3", "key point 4", "key point 5"],
  "entities": ["entity1", "entity2", "entity3"]
}

Topics: Main subjects covered in the document
Key Points: The most important takeaways
Entities: Names, organizations, dates, or other specific entities mentioned`;

    const response = await callGemini(prompt);

    try {
        // Try to extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                keyInfo: {
                    topics: parsed.topics || [],
                    keyPoints: parsed.keyPoints || [],
                    entities: parsed.entities || [],
                },
            };
        }
    } catch (e) {
        console.warn('Failed to parse AI key info response:', e);
    }

    // Fallback: empty results
    return {
        keyInfo: {
            topics: [],
            keyPoints: [],
            entities: [],
        },
    };
};
