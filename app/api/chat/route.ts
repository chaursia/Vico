import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/verify";
import { getUserChats, getOrCreateChat } from "@/lib/db/chat";
import { openChatSchema } from "@/lib/validations/chat";
import { apiLimiter, checkRateLimit } from "@/lib/ratelimit";

// GET /api/chat — list all personal chats for current user
export const GET = withAuth(async (req: NextRequest, user) => {
  const limited = await checkRateLimit(apiLimiter, req, user.id);
  if (limited) return limited;

  const { data, error } = await getUserChats(user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ chats: data });
});

// POST /api/chat — open or get a chat with another user
export const POST = withAuth(async (req: NextRequest, user) => {
  const body = await req.json();
  const parsed = openChatSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (parsed.data.user_id === user.id) {
    return NextResponse.json({ error: "Cannot chat with yourself" }, { status: 400 });
  }

  const { data, error } = await getOrCreateChat(user.id, parsed.data.user_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ chat: data }, { status: 200 });
});
