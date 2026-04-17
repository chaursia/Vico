import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth/verify";
import { supabaseAdmin } from "@/lib/supabase/server";
import { z } from "zod";

// GET /api/admin/signals?status=active&page=1
export const GET = withAdmin(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);
  const status = searchParams.get("status");
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from("signals")
    .select(
      "id, title, category, status, creator_id, created_at, expires_at, latitude, longitude",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ signals: data, total: count, page, limit });
});

// POST /api/admin/signals — force expire a signal
const actionSchema = z.object({
  signal_id: z.string().uuid(),
  action: z.enum(["force_expire", "delete"]),
});

export const POST = withAdmin(async (req: NextRequest, admin) => {
  const body = await req.json();
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { signal_id, action } = parsed.data;

  if (action === "force_expire") {
    await supabaseAdmin
      .from("signals")
      .update({ status: "expired" })
      .eq("id", signal_id);
  } else if (action === "delete") {
    await supabaseAdmin.from("signals").delete().eq("id", signal_id);
  }

  await supabaseAdmin.from("audit_logs").insert({
    admin_id: admin.id,
    action,
    target_type: "signal",
    target_id: signal_id,
  });

  return NextResponse.json({ message: `Signal ${action} successful` });
});
