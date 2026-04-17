import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validations/user";
import { authLimiter, checkRateLimit } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
  const limited = await checkRateLimit(authLimiter, req);
  if (limited) return limited;

  const body = await req.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { email, password } = parsed.data;

  // Use the anon client for sign-in (service role cannot sign in users directly)
  const { createClient } = await import("@supabase/supabase-js");
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await anonClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  // Fetch user profile
  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("id, username, profile_photo, trust_score, is_admin, is_banned")
    .eq("id", data.user.id)
    .single();

  if (profile?.is_banned) {
    return NextResponse.json({ error: "Account suspended" }, { status: 403 });
  }

  return NextResponse.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    user: {
      id: data.user.id,
      email: data.user.email,
      ...profile,
    },
  });
}
