import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/verify";
import { getUserById } from "@/lib/db/users";
import { updateProfileSchema } from "@/lib/validations/user";
import { supabaseAdmin } from "@/lib/supabase/server";
import { apiLimiter, checkRateLimit } from "@/lib/ratelimit";

// GET /api/users/me
export const GET = withAuth(async (_req, user) => {
  const { data, error } = await getUserById(user.id);
  if (error) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ user: data });
});

// PATCH /api/users/me
export const PATCH = withAuth(async (req: NextRequest, user) => {
  const limited = await checkRateLimit(apiLimiter, req, user.id);
  if (limited) return limited;

  const body = await req.json();
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Check username uniqueness if being updated
  if (parsed.data.username) {
    const { data: existing } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("username", parsed.data.username)
      .neq("id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .update(parsed.data)
    .eq("id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ user: data });
});
