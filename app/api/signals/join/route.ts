import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/verify";
import { joinSignal } from "@/lib/db/signals";
import { joinSignalSchema } from "@/lib/validations/signal";
import { createNotification } from "@/lib/db/notifications";
import { apiLimiter, checkRateLimit } from "@/lib/ratelimit";
import { supabaseAdmin } from "@/lib/supabase/server";

export const POST = withAuth(async (req: NextRequest, user) => {
  const limited = await checkRateLimit(apiLimiter, req, user.id);
  if (limited) return limited;

  const body = await req.json();
  const parsed = joinSignalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await joinSignal(parsed.data.signal_id, user.id);

  if ("error" in result && typeof result.error === "string") {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Notify the signal creator
  const { data: signal } = await supabaseAdmin
    .from("signals")
    .select("creator_id, title")
    .eq("id", parsed.data.signal_id)
    .single();

  if (signal && signal.creator_id !== user.id) {
    const { data: joiner } = await supabaseAdmin
      .from("users")
      .select("username")
      .eq("id", user.id)
      .single();

    await createNotification({
      user_id: signal.creator_id,
      type: "join",
      title: "Someone joined your signal!",
      body: `${joiner?.username ?? "A user"} joined "${signal.title}"`,
      meta: { signal_id: parsed.data.signal_id, user_id: user.id },
    });

    // Emit WS event
    try {
      const { emitSignalJoined } = await import("@/lib/websocket/server");
      emitSignalJoined(parsed.data.signal_id, {
        user_id: user.id,
        username: joiner?.username,
      });
    } catch {}
  }

  return NextResponse.json({ message: "Joined signal successfully", data: result.data });
});
