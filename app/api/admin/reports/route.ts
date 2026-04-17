import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth/verify";
import { supabaseAdmin } from "@/lib/supabase/server";

// GET /api/admin/reports
export const GET = withAdmin(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "pending";
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabaseAdmin
    .from("reports")
    .select(
      "id, reporter_id, target_type, target_id, reason, status, created_at, resolved_at",
      { count: "exact" }
    )
    .eq("status", status)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reports: data, total: count, page, limit });
});

// PATCH /api/admin/reports — resolve or dismiss a report
export const PATCH = withAdmin(async (req: NextRequest, admin) => {
  const { report_id, action } = await req.json();
  if (!report_id || !["resolve", "dismiss"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await supabaseAdmin
    .from("reports")
    .update({
      status: action === "resolve" ? "resolved" : "dismissed",
      resolved_at: new Date().toISOString(),
      resolved_by: admin.id,
    })
    .eq("id", report_id);

  await supabaseAdmin.from("audit_logs").insert({
    admin_id: admin.id,
    action: `report_${action}`,
    target_type: "report",
    target_id: report_id,
  });

  return NextResponse.json({ message: `Report ${action}d` });
});

// POST /api/admin/reports — submit a report (any authenticated user)
