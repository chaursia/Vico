import { supabaseAdmin } from "@/lib/supabase/server";

export type NotificationType =
  | "join"
  | "notice"
  | "chat"
  | "safety_check"
  | "nearby_signal";

export async function createNotification(payload: {
  user_id: string;
  title: string;
  body: string;
  type: NotificationType;
  meta?: Record<string, unknown>;
}) {
  return supabaseAdmin.from("notifications").insert(payload).select().single();
}

export async function getUserNotifications(userId: string, limit = 30) {
  return supabaseAdmin
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
}

export async function markNotificationsRead(userId: string, ids?: string[]) {
  let query = supabaseAdmin
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId);

  if (ids?.length) query = query.in("id", ids);

  return query;
}

export async function getUnacknowledgedSafetyChecks() {
  // Returns user_ids that have safety_check notifications older than 10 minutes
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  return supabaseAdmin
    .from("safety_checks")
    .select("*, users(id, emergency_contacts(*))")
    .is("acknowledged_at", null)
    .lt("created_at", tenMinutesAgo);
}
