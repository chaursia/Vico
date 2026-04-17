import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/verify";
import { getRoomMessages, sendRoomMessage } from "@/lib/db/chat";
import { sendRoomMessageSchema } from "@/lib/validations/chat";
import { supabaseAdmin } from "@/lib/supabase/server";
import { apiLimiter, checkRateLimit } from "@/lib/ratelimit";

// GET /api/room/[signalId]/messages
export const GET = withAuth(
  async (
    req: NextRequest,
    user,
    { params }: { params: Promise<{ signalId: string }> }
  ) => {
    const { signalId } = await params;

    const { data: room } = await supabaseAdmin
      .from("signal_rooms")
      .select("id")
      .eq("signal_id", signalId)
      .single();

    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const limit = parseInt(new URL(req.url).searchParams.get("limit") ?? "50");
    const { data, error } = await getRoomMessages(room.id, limit);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ messages: data });
  }
);

// POST /api/room/[signalId]/messages — send message to event room
export const POST = withAuth(
  async (
    req: NextRequest,
    user,
    { params }: { params: Promise<{ signalId: string }> }
  ) => {
    const limited = await checkRateLimit(apiLimiter, req, user.id);
    if (limited) return limited;

    const { signalId } = await params;

    // Verify membership
    const { data: signal } = await supabaseAdmin
      .from("signals")
      .select("creator_id")
      .eq("id", signalId)
      .single();

    const { data: participant } = await supabaseAdmin
      .from("signal_participants")
      .select("id")
      .eq("signal_id", signalId)
      .eq("user_id", user.id)
      .eq("status", "joined")
      .maybeSingle();

    const isHost = signal?.creator_id === user.id;
    if (!isHost && !participant) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { data: room } = await supabaseAdmin
      .from("signal_rooms")
      .select("id, is_closed")
      .eq("signal_id", signalId)
      .single();

    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
    if (room.is_closed) return NextResponse.json({ error: "Room is closed" }, { status: 410 });

    const body = await req.json();
    const parsed = sendRoomMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { data, error } = await sendRoomMessage(
      room.id,
      user.id,
      parsed.data.message,
      isHost && parsed.data.type === "notice" ? "notice" : "text"
    );

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ message: data }, { status: 201 });
  }
);
