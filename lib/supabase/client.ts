import { createClient } from "@supabase/supabase-js";

/**
 * Client-side Supabase client using the anon key.
 * Respects Row Level Security policies.
 */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
