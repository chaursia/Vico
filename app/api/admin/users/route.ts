import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth/verify";
import { supabaseAdmin } from "@/lib/supabase/server";
import { banUser } from "@/lib/db/users";
import { z } from "zod";

// GET /api/admin/users?page=1&limit=20&search=username
export const GET = withAdmin(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);
  const search = searchParams.get("search") ?? "";
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from("users")
    .select("id, username, bio, trust_score, is_admin, is_banned, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.ilike("username", `%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    users: data,
    total: count,
    page,
    limit,
    pages: Math.ceil((count ?? 0) / limit),
  });
});

const actionSchema = z.object({
  user_id: z.string().uuid(),
  action: z.enum(["ban", "unban", "make_admin", "remove_admin"]),
});

// POST /api/admin/users — perform user action
export const POST = withAdmin(async (req: NextRequest, admin) => {
  const body = await req.json();
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { user_id, action } = parsed.data;

  let updateData: Record<string, unknown> = {};
  if (action === "ban") updateData = { is_banned: true };
  else if (action === "unban") updateData = { is_banned: false };
  else if (action === "make_admin") updateData = { is_admin: true };
  else if (action === "remove_admin") updateData = { is_admin: false };

  const { error } = await supabaseAdmin
    .from("users")
    .update(updateData)
    .eq("id", user_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit log
  await supabaseAdmin.from("audit_logs").insert({
    admin_id: admin.id,
    action,
    target_type: "user",
    target_id: user_id,
  });

  return NextResponse.json({ message: `User ${action} successful` });
});
