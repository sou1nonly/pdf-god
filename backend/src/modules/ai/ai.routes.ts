/**
 * AI Module - Routes
 */

import { Router } from 'express';
import * as aiController from './ai.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
    chatSchema,
    summarizeSchema,
    rewriteSchema,
    questionsSchema,
    extractSchema,
} from './ai.types';

const router = Router();

// All AI routes require authentication
router.use(authMiddleware);

/**
 * @route   POST /api/ai/chat
 * @desc    Chat with document content
 * @access  Private
 */
router.post('/chat', validate(chatSchema), aiController.chat);

/**
 * @route   POST /api/ai/summarize
 * @desc    Summarize document
 * @access  Private
 */
router.post('/summarize', validate(summarizeSchema), aiController.summarize);

/**
 * @route   POST /api/ai/rewrite
 * @desc    Rewrite text in different tones
 * @access  Private
 */
router.post('/rewrite', validate(rewriteSchema), aiController.rewrite);

/**
 * @route   POST /api/ai/questions
 * @desc    Generate questions about document
 * @access  Private
 */
router.post('/questions', validate(questionsSchema), aiController.questions);

/**
 * @route   POST /api/ai/extract
 * @desc    Extract key information
 * @access  Private
 */
router.post('/extract', validate(extractSchema), aiController.extract);

export { router as aiRouter };
