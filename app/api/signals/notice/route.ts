import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/verify";
import { signalNoticeSchema } from "@/lib/validations/signal";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendRoomMessage } from "@/lib/db/chat";
import { createNotification } from "@/lib/db/notifications";

export const POST = withAuth(async (req: NextRequest, user) => {
  const body = await req.json();
  const parsed = signalNoticeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { signal_id, message } = parsed.data;

  // Verify host
  const { data: signal } = await supabaseAdmin
    .from("signals")
    .select("creator_id, title")
    .eq("id", signal_id)
    .single();

  if (!signal || signal.creator_id !== user.id) {
    return NextResponse.json({ error: "Only the host can send notices" }, { status: 403 });
  }

  // Get room
  const { data: room } = await supabaseAdmin
    .from("signal_rooms")
    .select("id")
    .eq("signal_id", signal_id)
    .single();

  if (room) {
    await sendRoomMessage(room.id, user.id, message, "notice");
  }

  // Notify all participants
  const { data: participants } = await supabaseAdmin
    .from("signal_participants")
    .select("user_id")
    .eq("signal_id", signal_id)
    .eq("status", "joined");

  const notifyIds = (participants ?? [])
    .map((p) => p.user_id)
    .filter((id) => id !== user.id);

  await Promise.all(
    notifyIds.map((uid) =>
      createNotification({
        user_id: uid,
        type: "notice",
        title: `Host notice: ${signal.title}`,
        body: message,
        meta: { signal_id },
      })
    )
  );

  // Emit WS
  try {
    const { emitSignalNotice } = await import("@/lib/websocket/server");
    emitSignalNotice(signal_id, { message, sender_id: user.id });
  } catch {}

  return NextResponse.json({ message: "Notice sent to all participants" });
});
