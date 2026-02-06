/**
 * AI API - Single Endpoint
 * /api/ai.ts
 * 
 * Uses query param ?action= for routing:
 * - POST /api/ai?action=chat      - Chat with document
 * - POST /api/ai?action=summarize - Summarize document
 * - POST /api/ai?action=rewrite   - Rewrite text in different tones
 * - POST /api/ai?action=questions - Generate questions
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from './lib/auth';
import { sendSuccess, sendError, handleError } from './lib/response';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-flash';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

type AIRewriteTone = 'formal' | 'casual' | 'concise' | 'detailed';

// ============================================
// Gemini API Helper
// ============================================

async function callGemini(prompt: string, systemInstruction?: string, temperature: number = 0.7): Promise<string> {
    if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY not configured');
    }

    const requestBody: any = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature, maxOutputTokens: 2048 },
    };

    if (systemInstruction) {
        requestBody.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        }
    );

    if (!response.ok) {
        const errText = await response.text();
        console.error('Gemini API error:', errText);
        if (response.status === 429) {
            throw new Error('AI rate limit exceeded. Please wait a moment.');
        }
        throw new Error(`AI service error: ${errText.substring(0, 100)}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
        throw new Error('No response from AI');
    }

    return text;
}

// ============================================
// Main Handler
// ============================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return sendError(res, 'METHOD_NOT_ALLOWED', 'Only POST allowed', 405);
    }

    const action = req.query.action as string;

    try {
        await requireAuth(req);

        // ============================================
        // POST ?action=chat - Chat with document
        // ============================================
        if (action === 'chat') {
            const { message, documentText, history = [] } = req.body || {};

            if (!message) {
                return sendError(res, 'MISSING_PARAM', 'message required', 400);
            }

            const systemInstruction = `You are a helpful AI assistant for analyzing PDF documents. You help users understand, extract insights, and work with document content.

DOCUMENT CONTENT:
---
${(documentText || '').slice(0, 25000)}
---

INSTRUCTIONS:
1. Answer questions directly and concisely based on the document
2. When quoting from the document, use exact text in quotes
3. If information isn't in the document, say "I couldn't find this in the document" but offer to help with what you can see
4. Format lists, key points, and structured data clearly
5. Be conversational but informative`;

            let prompt = '';
            for (const msg of (history as ChatMessage[]).slice(-10)) {
                prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
            }
            prompt += `User: ${message}\nAssistant:`;

            const response = await callGemini(prompt, systemInstruction, 0.5);
            return sendSuccess(res, { response, confidence: 0.85 });
        }

        // ============================================
        // POST ?action=summarize - Summarize document
        // ============================================
        if (action === 'summarize') {
            const { documentText, length = 'brief' } = req.body || {};

            if (!documentText || documentText.length < 50) {
                return sendError(res, 'MISSING_PARAM', 'documentText required (min 50 chars)', 400);
            }

            const isBrief = length === 'brief';

            const prompt = isBrief
                ? `Analyze this document and provide a BRIEF executive summary.

DOCUMENT:
${documentText.slice(0, 30000)}

Provide a summary with:
• **Overview** (1-2 sentences): What is this document about?
• **Key Points** (3-5 bullet points): The most important takeaways
• **Main Conclusion**: The bottom line or call to action

Keep it concise and actionable. Use bullet points for clarity.`

                : `Analyze this document and provide a DETAILED summary.

DOCUMENT:
${documentText.slice(0, 30000)}

Provide a comprehensive summary with:

**Document Type & Purpose**
What kind of document is this and what is its main purpose?

**Executive Summary**
2-3 sentences capturing the essence of the document.

**Key Sections & Findings**
Break down each major section with its key points.

**Important Data & Figures**
Any statistics, numbers, dates, or quantifiable information mentioned.

**Conclusions & Recommendations**
What are the main takeaways and any suggested actions?

**Target Audience**
Who is this document intended for?

Format with clear headers and bullet points for easy reading.`;

            const summary = await callGemini(prompt, undefined, 0.3);
            const wordCount = summary.split(/\s+/).length;
            return sendSuccess(res, { summary, wordCount });
        }

        // ============================================
        // POST ?action=rewrite - Rewrite text
        // ============================================
        if (action === 'rewrite') {
            const { text, tone = 'formal' } = req.body || {};

            if (!text || text.length < 10) {
                return sendError(res, 'MISSING_PARAM', 'text required (min 10 chars)', 400);
            }

            const toneInstructions: Record<AIRewriteTone, string> = {
                formal: `Rewrite this text in a PROFESSIONAL, FORMAL style suitable for:
- Business emails and reports
- Academic papers
- Official documentation
- Corporate communications

Guidelines:
- Use proper grammar and complete sentences
- Avoid contractions (use "do not" instead of "don't")
- Use industry-standard terminology
- Maintain a respectful, authoritative tone`,

                casual: `Rewrite this text in a FRIENDLY, CASUAL style suitable for:
- Social media posts
- Blog articles
- Friendly emails
- Chat messages

Guidelines:
- Use conversational language
- Contractions are fine (it's, we're, you'll)
- Be warm and approachable
- Keep it natural and relatable`,

                concise: `Rewrite this text to be CONCISE and TO-THE-POINT:
- Remove all filler words and redundancy
- Get straight to the point
- Use short, punchy sentences
- Keep only essential information

Guidelines:
- Cut word count by 40-60%
- One idea per sentence
- Active voice only
- No fluff or padding`,

                detailed: `Rewrite this text with MORE DETAIL and EXPLANATION:
- Expand on key concepts
- Add context and background
- Include examples where helpful
- Make it comprehensive

Guidelines:
- Elaborate on important points
- Add transitional phrases for flow
- Include relevant details
- Make it thorough but readable`
            };

            const prompt = `You are a text rewriting assistant. Your job is to REWRITE the given text, not describe it or summarize it.

${toneInstructions[tone as AIRewriteTone] || toneInstructions.formal}

CRITICAL RULES:
1. Output the ACTUAL REWRITTEN TEXT - do NOT describe what you would do
2. Do NOT start with phrases like "Here is..." or "This text..." or "The following..."
3. Just write the rewritten version directly
4. Preserve the same general MEANING but change the STYLE and WORDING
5. Keep it similar length to the original

ORIGINAL TEXT TO REWRITE:
"${text}"

Now provide exactly 2 rewritten versions. Write ONLY the rewritten text, nothing else:

VERSION 1:

VERSION 2:
`;

            const response = await callGemini(prompt, undefined, 0.7);

            // Parse the versions
            const versionMatches = response.match(/VERSION \d+:\s*([\s\S]*?)(?=VERSION \d+:|$)/gi);
            let suggestions: string[] = [];

            if (versionMatches && versionMatches.length > 0) {
                suggestions = versionMatches
                    .map(v => v.replace(/VERSION \d+:\s*/i, '').trim())
                    .filter(s => s.length > 0);
            }

            // Fallback: split by double newline if version parsing fails
            if (suggestions.length === 0) {
                suggestions = response
                    .split(/\n\n+/)
                    .map(s => s.trim())
                    .filter(s => s.length > 20 && !s.toLowerCase().startsWith('version'))
                    .slice(0, 2);
            }

            return sendSuccess(res, {
                suggestions: suggestions.length > 0 ? suggestions : [text]
            });
        }

        // ============================================
        // POST ?action=questions - Generate questions
        // ============================================
        if (action === 'questions') {
            const { documentText, count = 5 } = req.body || {};

            if (!documentText || documentText.length < 50) {
                return sendError(res, 'MISSING_PARAM', 'documentText required', 400);
            }

            const prompt = `Analyze this document and generate ${count} PRACTICAL questions that would help someone:
- Understand the key concepts
- Apply the information
- Identify important details
- Think critically about the content

DOCUMENT:
${documentText.slice(0, 20000)}

Generate ${count} diverse questions covering different aspects. Include a mix of:
- Factual questions (who, what, when, where)
- Analytical questions (why, how)
- Application questions (how would you...)

Format: One question per line, no numbering.`;

            const response = await callGemini(prompt, undefined, 0.6);
            const questions = response
                .split('\n')
                .map((q) => q.replace(/^[\d\.\-\*\)]+\s*/, '').trim())
                .filter((q) => q.length > 15 && (q.endsWith('?') || q.includes('?')))
                .slice(0, count);

            return sendSuccess(res, { questions });
        }

        // Unknown action
        return sendError(res, 'NOT_FOUND', `Unknown action: ${action}`, 404);

    } catch (error) {
        return handleError(res, error);
    }
}
