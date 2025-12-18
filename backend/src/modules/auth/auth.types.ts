/**
 * Auth Module - Types
 */

import { z } from 'zod';

// Validation Schemas
export const googleAuthSchema = z.object({
    idToken: z.string().optional(),
    accessToken: z.string().optional(),
    redirectTo: z.string().optional(),
});

export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const logoutSchema = z.object({
    refreshToken: z.string().optional(),
});

// Types derived from schemas
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
