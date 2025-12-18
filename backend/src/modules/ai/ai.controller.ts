/**
 * AI Module - Controller
 */

import { Request, Response, NextFunction } from 'express';
import * as aiService from './ai.service';
import { sendSuccess, sendError } from '../../shared/response';
import type { ChatInput, SummarizeInput, RewriteInput, QuestionsInput, ExtractInput } from './ai.types';

/**
 * POST /api/ai/chat
 * Chat with document content
 */
export const chat = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            sendError(res, 'AUTH_REQUIRED', 'Not authenticated', 401);
            return;
        }

        const { message, documentText, history } = req.body as ChatInput;
        const result = await aiService.chat(message, documentText, history);

        sendSuccess(res, result);
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/ai/summarize
 * Summarize document
 */
export const summarize = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            sendError(res, 'AUTH_REQUIRED', 'Not authenticated', 401);
            return;
        }

        const { documentText, length } = req.body as SummarizeInput;
        const result = await aiService.summarize(documentText, length);

        sendSuccess(res, result);
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/ai/rewrite
 * Rewrite text in different tones
 */
export const rewrite = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            sendError(res, 'AUTH_REQUIRED', 'Not authenticated', 401);
            return;
        }

        const { text, tone } = req.body as RewriteInput;
        const result = await aiService.rewrite(text, tone);

        sendSuccess(res, result);
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/ai/questions
 * Generate questions about document
 */
export const questions = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            sendError(res, 'AUTH_REQUIRED', 'Not authenticated', 401);
            return;
        }

        const { documentText, count } = req.body as QuestionsInput;
        const result = await aiService.generateQuestions(documentText, count);

        sendSuccess(res, result);
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/ai/extract
 * Extract key information from document
 */
export const extract = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            sendError(res, 'AUTH_REQUIRED', 'Not authenticated', 401);
            return;
        }

        const { documentText } = req.body as ExtractInput;
        const result = await aiService.extractKeyInfo(documentText);

        sendSuccess(res, result);
    } catch (error) {
        next(error);
    }
};
