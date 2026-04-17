import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { signupSchema } from "@/lib/validations/user";
import { authLimiter, checkRateLimit } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
  // Rate limit
  const limited = await checkRateLimit(authLimiter, req);
  if (limited) return limited;

  const body = await req.json();
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { email, password, username } = parsed.data;

  // Check username uniqueness
  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Username already taken" }, { status: 409 });
  }

  // Create Supabase auth user
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message ?? "Signup failed" },
      { status: 400 }
    );
  }

  // Insert user profile
  const { error: profileError } = await supabaseAdmin.from("users").insert({
    id: authData.user.id,
    username,
    trust_score: 50,
    is_admin: false,
    is_banned: false,
  });

  if (profileError) {
    // Rollback auth user
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: "Failed to create user profile" }, { status: 500 });
  }

  // Sign in to get a session token
  const { data: session, error: sessionError } =
    await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

  return NextResponse.json(
    {
      message: "Account created successfully",
      user: { id: authData.user.id, email, username },
    },
    { status: 201 }
  );
}
