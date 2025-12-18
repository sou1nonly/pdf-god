/**
 * Convert Module - Types
 */

import { z } from 'zod';

// Since file conversion uses multer, validation schemas are simpler
export const convertOptionsSchema = z.object({
    quality: z.enum(['low', 'medium', 'high']).optional().default('high'),
});

export type ConvertOptions = z.infer<typeof convertOptionsSchema>;
