import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth/verify";
import { supabaseAdmin } from "@/lib/supabase/server";

// GET /api/admin/audit-logs
export const GET = withAdmin(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabaseAdmin
    .from("audit_logs")
    .select(
      "id, admin_id, action, target_type, target_id, created_at, admins:users!audit_logs_admin_id_fkey(username)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ logs: data, total: count, page, limit });
});
