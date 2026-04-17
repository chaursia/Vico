import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client using the service role key.
 * Lazy-initialized so env vars are available before first use.
 * Bypasses RLS — only use in trusted server contexts.
 */
let _supabaseAdmin: SupabaseClient | null = null;

function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || url.includes("your-project")) {
    throw new Error(
      "[Supabase] NEXT_PUBLIC_SUPABASE_URL is not set. " +
        "Copy it from your Supabase Dashboard → Settings → API"
    );
  }
  if (!key || key.startsWith("eyJ") === false) {
    throw new Error(
      "[Supabase] SUPABASE_SERVICE_ROLE_KEY is not set. " +
        "Copy it from your Supabase Dashboard → Settings → API"
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_supabaseAdmin) {
      _supabaseAdmin = createAdminClient();
    }
    const val = (_supabaseAdmin as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function" ? val.bind(_supabaseAdmin) : val;
  },
});
