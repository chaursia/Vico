import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/verify";
import { getOrCreateRoom } from "@/lib/db/chat";
import { supabaseAdmin } from "@/lib/supabase/server";

// GET /api/room/[signalId] — get or create event chat room
export const GET = withAuth(
  async (
    _req: NextRequest,
    user,
    { params }: { params: Promise<{ signalId: string }> }
  ) => {
    const { signalId } = await params;

    // Verify user is a participant or creator
    const { data: signal } = await supabaseAdmin
      .from("signals")
      .select("creator_id, expires_at, status")
      .eq("id", signalId)
      .single();

    if (!signal) {
      return NextResponse.json({ error: "Signal not found" }, { status: 404 });
    }

    const { data: participant } = await supabaseAdmin
      .from("signal_participants")
      .select("id")
      .eq("signal_id", signalId)
      .eq("user_id", user.id)
      .eq("status", "joined")
      .maybeSingle();

    const isHost = signal.creator_id === user.id;
    if (!isHost && !participant) {
      return NextResponse.json({ error: "Join the signal to access chat" }, { status: 403 });
    }

    // Extend room expiry a bit past signal expiry
    const roomExpiry = new Date(
      new Date(signal.expires_at).getTime() + 30 * 60 * 1000
    ).toISOString();

    const { data: room, error } = await getOrCreateRoom(signalId, roomExpiry);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ room });
  }
);
