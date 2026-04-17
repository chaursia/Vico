import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/verify";
import {
  getUserNotifications,
  markNotificationsRead,
} from "@/lib/db/notifications";

// GET /api/notifications
export const GET = withAuth(async (req: NextRequest, user) => {
  const limit = parseInt(
    new URL(req.url).searchParams.get("limit") ?? "30"
  );
  const { data, error } = await getUserNotifications(user.id, limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notifications: data });
});

// PATCH /api/notifications — mark as read
export const PATCH = withAuth(async (req: NextRequest, user) => {
  const body = await req.json().catch(() => ({}));
  const ids: string[] | undefined = body.ids; // undefined = all

  await markNotificationsRead(user.id, ids);
  return NextResponse.json({ message: "Notifications marked as read" });
});
