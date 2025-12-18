/**
 * Environment Configuration
 * Centralizes all environment variables with validation
 */

import { config } from 'dotenv';
import { z } from 'zod';

// Load .env file
config();

// Environment schema - make all optional for development
const envSchema = z.object({
    // Server
    PORT: z.string().default('3001'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    // Supabase
    SUPABASE_URL: z.string().optional(),
    SUPABASE_SERVICE_KEY: z.string().optional(),
    SUPABASE_ANON_KEY: z.string().optional(),

    // Gemini AI
    GEMINI_API_KEY: z.string().optional(),

    // JWT
    JWT_SECRET: z.string().optional(),
    JWT_EXPIRES_IN: z.string().default('7d'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

    // CORS
    ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
    RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),

    // File Upload
    MAX_FILE_SIZE_MB: z.string().default('100'),
});

// Parse and validate environment
const parseEnv = () => {
    const parsed = envSchema.parse(process.env);

    // Warn about missing required values
    const missing: string[] = [];
    if (!parsed.SUPABASE_URL) missing.push('SUPABASE_URL');
    if (!parsed.SUPABASE_SERVICE_KEY) missing.push('SUPABASE_SERVICE_KEY');
    if (!parsed.SUPABASE_ANON_KEY) missing.push('SUPABASE_ANON_KEY');
    if (!parsed.GEMINI_API_KEY) missing.push('GEMINI_API_KEY');
    if (!parsed.JWT_SECRET) missing.push('JWT_SECRET');

    if (missing.length > 0) {
        console.warn('');
        console.warn('⚠️  Missing environment variables:', missing.join(', '));
        console.warn('   Copy backend/.env.example to backend/.env and fill in values');
        console.warn('   Some features will not work without proper configuration');
        console.warn('');
    }

    return parsed;
};

const parsedEnv = parseEnv();

export const env = {
    // Server
    port: parseInt(parsedEnv.PORT || '3001', 10),
    nodeEnv: parsedEnv.NODE_ENV || 'development',
    isDev: (parsedEnv.NODE_ENV || 'development') === 'development',
    isProd: parsedEnv.NODE_ENV === 'production',

    // Supabase
    supabase: {
        url: parsedEnv.SUPABASE_URL || '',
        serviceKey: parsedEnv.SUPABASE_SERVICE_KEY || '',
        anonKey: parsedEnv.SUPABASE_ANON_KEY || '',
    },

    // Gemini
    gemini: {
        apiKey: parsedEnv.GEMINI_API_KEY || '',
    },

    // JWT
    jwt: {
        secret: parsedEnv.JWT_SECRET || 'development-secret-key-min-32-chars!',
        expiresIn: parsedEnv.JWT_EXPIRES_IN || '7d',
        refreshExpiresIn: parsedEnv.JWT_REFRESH_EXPIRES_IN || '30d',
    },

    // CORS
    cors: {
        origins: (parsedEnv.ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map(s => s.trim()),
    },

    // Rate Limiting
    rateLimit: {
        windowMs: parseInt(parsedEnv.RATE_LIMIT_WINDOW_MS || '900000', 10),
        maxRequests: parseInt(parsedEnv.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    },

    // File Upload
    upload: {
        maxFileSizeMB: parseInt(parsedEnv.MAX_FILE_SIZE_MB || '100', 10),
        maxFileSizeBytes: parseInt(parsedEnv.MAX_FILE_SIZE_MB || '100', 10) * 1024 * 1024,
    },
} as const;

export type Env = typeof env;
