/**
 * AI Module - Types
 */

import { z } from 'zod';

// Validation Schemas
export const chatSchema = z.object({
    message: z.string().min(1, 'Message is required'),
    documentText: z.string().min(1, 'Document text is required'),
    history: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
    })).optional().default([]),
});

export const summarizeSchema = z.object({
    documentText: z.string().min(1, 'Document text is required'),
    length: z.enum(['brief', 'detailed']).default('brief'),
});

export const rewriteSchema = z.object({
    text: z.string().min(1, 'Text is required'),
    tone: z.enum(['formal', 'casual', 'concise', 'detailed']).default('formal'),
});

export const questionsSchema = z.object({
    documentText: z.string().min(1, 'Document text is required'),
    count: z.number().int().positive().max(10).optional().default(5),
});

export const extractSchema = z.object({
    documentText: z.string().min(1, 'Document text is required'),
});

// Types
export type ChatInput = z.infer<typeof chatSchema>;
export type SummarizeInput = z.infer<typeof summarizeSchema>;
export type RewriteInput = z.infer<typeof rewriteSchema>;
export type QuestionsInput = z.infer<typeof questionsSchema>;
export type ExtractInput = z.infer<typeof extractSchema>;
