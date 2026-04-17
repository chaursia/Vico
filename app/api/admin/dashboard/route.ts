import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth/verify";
import { supabaseAdmin } from "@/lib/supabase/server";

export const GET = withAdmin(async (_req: NextRequest) => {
  const [
    { count: totalUsers },
    { count: activeSignals },
    { count: totalSignals },
    { count: pendingSafetyChecks },
    { data: recentSignals },
    { data: subscriptionStats },
  ] = await Promise.all([
    supabaseAdmin.from("users").select("*", { count: "exact", head: true }),
    supabaseAdmin
      .from("signals")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabaseAdmin.from("signals").select("*", { count: "exact", head: true }),
    supabaseAdmin
      .from("safety_checks")
      .select("*", { count: "exact", head: true })
      .is("acknowledged_at", null),
    supabaseAdmin
      .from("signals")
      .select("id, title, status, created_at, creator_id")
      .order("created_at", { ascending: false })
      .limit(5),
    supabaseAdmin
      .from("subscriptions")
      .select("plan, status")
      .eq("status", "active"),
  ]);

  const planBreakdown = (subscriptionStats ?? []).reduce(
    (acc: Record<string, number>, s: { plan: string }) => {
      acc[s.plan] = (acc[s.plan] ?? 0) + 1;
      return acc;
    },
    {}
  );

  return NextResponse.json({
    stats: {
      total_users: totalUsers ?? 0,
      active_signals: activeSignals ?? 0,
      total_signals: totalSignals ?? 0,
      pending_safety_checks: pendingSafetyChecks ?? 0,
      active_subscriptions: subscriptionStats?.length ?? 0,
    },
    plan_breakdown: planBreakdown,
    recent_signals: recentSignals ?? [],
  });
});
