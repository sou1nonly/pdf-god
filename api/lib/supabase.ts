/**
 * Supabase Admin Client for Vercel Functions
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseAdmin: SupabaseClient | null = null;

export const getSupabaseAdmin = (): SupabaseClient => {
    if (!supabaseAdmin) {
        const url = process.env.SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_KEY;

        if (!url || !serviceKey) {
            throw new Error('Supabase configuration missing. Check SUPABASE_URL and SUPABASE_SERVICE_KEY');
        }

        supabaseAdmin = createClient(url, serviceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
    }

    return supabaseAdmin;
};

export { SupabaseClient };
