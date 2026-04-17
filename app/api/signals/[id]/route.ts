import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/verify";
import { getSignalById, getSignalParticipants } from "@/lib/db/signals";

// GET /api/signals/[id]
export const GET = withAuth(
  async (_req: NextRequest, _user, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const { data: signal, error } = await getSignalById(id);
    if (error || !signal) {
      return NextResponse.json({ error: "Signal not found" }, { status: 404 });
    }

    const { data: participants } = await getSignalParticipants(id);

    return NextResponse.json({ signal, participants: participants ?? [] });
  }
);
