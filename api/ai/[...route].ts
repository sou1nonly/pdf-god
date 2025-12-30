/**
 * AI API Routes
 * /api/ai/[...route].ts
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../lib/auth';
import { sendSuccess, sendError, handleError } from '../lib/response';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

interface GeminiResponse {
    candidates?: Array<{
        content?: {
            parts?: Array<{ text?: string }>;
        };
    }>;
    error?: { message: string };
}

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

type AISummaryLength = 'brief' | 'detailed';
type AIRewriteTone = 'formal' | 'casual' | 'concise' | 'detailed';

const callGemini = async (prompt: string, systemInstruction?: string): Promise<string> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw { code: 'AI_SERVICE_UNAVAILABLE', message: 'Gemini API key not configured', status: 500 };
    }

    const requestBody: any = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
    };

    if (systemInstruction) {
        requestBody.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        if (response.status === 429) {
            throw { code: 'AI_RATE_LIMITED', message: 'AI rate limit exceeded', status: 429 };
        }
        throw { code: 'AI_SERVICE_UNAVAILABLE', message: 'AI service error', status: 500 };
    }

    const data = (await response.json()) as GeminiResponse;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
        throw { code: 'AI_SERVICE_UNAVAILABLE', message: 'No response from AI', status: 500 };
    }

    return text;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return sendError(res, 'METHOD_NOT_ALLOWED', 'Only POST allowed', 405);
    }

    const route = req.query.route as string[] | undefined;
    const action = route?.[0] || '';

    try {
        await requireAuth(req);

        // POST /api/ai/chat
        if (action === 'chat') {
            const { message, documentText, history = [] } = req.body || {};

            const systemInstruction = `You are an AI assistant helping users understand and work with PDF documents.
You have access to the following document content to answer questions:

--- DOCUMENT START ---
${(documentText || '').slice(0, 25000)}
--- DOCUMENT END ---

Instructions:
- Answer questions based on the document content when relevant
- Be helpful, accurate, and concise
- If the question is not related to the document, you can still help with general questions
- Always be friendly and professional`;

            let prompt = '';
            for (const msg of (history as ChatMessage[]).slice(-10)) {
                prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
            }
            prompt += `User: ${message}\nAssistant:`;

            const response = await callGemini(prompt, systemInstruction);
            return sendSuccess(res, { response, confidence: 0.85 });
        }

        // POST /api/ai/summarize
        if (action === 'summarize') {
            const { documentText, length = 'brief' } = req.body || {};
            const wordLimit = length === 'brief' ? 150 : 400;

            const prompt = `Summarize the following document in approximately ${wordLimit} words.
Focus on the main points, key findings, and important conclusions.

Document:
${(documentText || '').slice(0, 30000)}

Summary:`;

            const summary = await callGemini(prompt);
            const wordCount = summary.split(/\s+/).length;
            return sendSuccess(res, { summary, wordCount });
        }

        // POST /api/ai/rewrite
        if (action === 'rewrite') {
            const { text, tone = 'formal' } = req.body || {};
            const toneDescriptions: Record<AIRewriteTone, string> = {
                formal: 'professional, formal, and business-appropriate',
                casual: 'friendly, conversational, and approachable',
                concise: 'brief, to-the-point, and efficient',
                detailed: 'comprehensive, thorough, and explanatory',
            };

            const prompt = `Rewrite the following text in a ${toneDescriptions[tone as AIRewriteTone]} style.
Provide 3 different variations.

Original text:
"${text}"

Format your response as:
1. [First variation]
2. [Second variation]
3. [Third variation]`;

            const response = await callGemini(prompt);
            const suggestions = response
                .split(/\d+\.\s+/)
                .filter((s) => s.trim())
                .map((s) => s.trim().replace(/^\[|\]$/g, ''))
                .slice(0, 3);

            return sendSuccess(res, { suggestions });
        }

        // POST /api/ai/questions
        if (action === 'questions') {
            const { documentText, count = 5 } = req.body || {};

            const prompt = `Based on the following document, generate ${count} thoughtful questions that would help someone understand the content better.

Document:
${(documentText || '').slice(0, 20000)}

Generate exactly ${count} questions, one per line:`;

            const response = await callGemini(prompt);
            const questions = response
                .split('\n')
                .map((q) => q.replace(/^\d+[\.)\s]*/, '').trim())
                .filter((q) => q.length > 10 && q.endsWith('?'))
                .slice(0, count);

            return sendSuccess(res, { questions });
        }

        // POST /api/ai/extract
        if (action === 'extract') {
            const { documentText } = req.body || {};

            const prompt = `Analyze the following document and extract key information.

Document:
${(documentText || '').slice(0, 25000)}

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
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    return sendSuccess(res, {
                        keyInfo: {
                            topics: parsed.topics || [],
                            keyPoints: parsed.keyPoints || [],
                            entities: parsed.entities || [],
                        },
                    });
                }
            } catch {
                // Fallback
            }

            return sendSuccess(res, {
                keyInfo: { topics: [], keyPoints: [], entities: [] },
            });
        }

        return sendError(res, 'NOT_FOUND', `Route not found: ${action}`, 404);
    } catch (error) {
        return handleError(res, error);
    }
}
