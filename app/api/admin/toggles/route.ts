import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth/verify";
import { supabaseAdmin } from "@/lib/supabase/server";

const DEFAULT_TOGGLES = [
  { key: "registrations", label: "User Registrations", enabled: true },
  { key: "subscriptions", label: "Subscriptions", enabled: true },
  { key: "signal_creation", label: "Signal Creation", enabled: true },
  { key: "chat_system", label: "Chat System", enabled: true },
  { key: "safety_system", label: "Safety System", enabled: true },
  { key: "maintenance_mode", label: "Maintenance Mode", enabled: false },
];

// GET /api/admin/toggles
export const GET = withAdmin(async () => {
  const { data, error } = await supabaseAdmin
    .from("feature_toggles")
    .select("*")
    .order("key");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ toggles: data });
});

// PATCH /api/admin/toggles — enable/disable a feature
export const PATCH = withAdmin(async (req: NextRequest, admin) => {
  const body = await req.json();
  const { key, enabled } = body as { key: string; enabled: boolean };

  if (!key || typeof enabled !== "boolean") {
    return NextResponse.json({ error: "key and enabled required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("feature_toggles")
    .upsert({ key, enabled, updated_at: new Date().toISOString() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin.from("audit_logs").insert({
    admin_id: admin.id,
    action: `toggle_${key}_${enabled ? "on" : "off"}`,
    target_type: "feature_toggle",
    target_id: key,
  });

  return NextResponse.json({ toggle: data });
});
