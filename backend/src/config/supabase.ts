/**
 * Supabase Admin Client
 * Server-side client with service role key for full access
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

let supabaseAdmin: SupabaseClient | null = null;

/**
 * Get Supabase admin client (singleton)
 * Uses service role key for full database access
 */
export const getSupabaseAdmin = (): SupabaseClient => {
    if (!supabaseAdmin) {
        if (!env.supabase.url || !env.supabase.serviceKey) {
            throw new Error('Supabase configuration missing. Check SUPABASE_URL and SUPABASE_SERVICE_KEY');
        }

        supabaseAdmin = createClient(env.supabase.url, env.supabase.serviceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
    }

    return supabaseAdmin;
};

/**
 * Create a Supabase client for a specific user
 * Uses the user's JWT token for RLS
 */
export const getSupabaseForUser = (accessToken: string): SupabaseClient => {
    if (!env.supabase.url || !env.supabase.anonKey) {
        throw new Error('Supabase configuration missing');
    }

    return createClient(env.supabase.url, env.supabase.anonKey, {
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
};

export { SupabaseClient };
