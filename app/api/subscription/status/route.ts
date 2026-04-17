import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/verify";
import { supabaseAdmin } from "@/lib/supabase/server";

export const GET = withAuth(async (_req: NextRequest, user) => {
  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    subscription: data ?? null,
    is_active: data?.status === "active",
    plan: data?.plan ?? "free",
  });
});
