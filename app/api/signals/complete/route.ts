import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/verify";
import { completeSignal } from "@/lib/db/signals";
import { completeSignalSchema } from "@/lib/validations/signal";

export const POST = withAuth(async (req: NextRequest, user) => {
  const body = await req.json();
  const parsed = completeSignalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await completeSignal(parsed.data.signal_id, user.id);

  if ("error" in result && typeof result.error === "string") {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  // Emit WS event to the signal room
  try {
    const { emitSignalCompleted } = await import("@/lib/websocket/server");
    emitSignalCompleted(parsed.data.signal_id);
  } catch {}

  return NextResponse.json({ message: "Signal marked as completed", data: result.data });
});
