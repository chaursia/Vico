import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/verify";
import { sendMessage, getChatMessages } from "@/lib/db/chat";
import { sendMessageSchema } from "@/lib/validations/chat";
import { apiLimiter, checkRateLimit } from "@/lib/ratelimit";
import { supabaseAdmin } from "@/lib/supabase/server";
import { emitChatMessage } from "@/lib/websocket/server";
import { createNotification } from "@/lib/db/notifications";

// POST /api/chat/send
export const POST = withAuth(async (req: NextRequest, user) => {
  const limited = await checkRateLimit(apiLimiter, req, user.id);
  if (limited) return limited;

  const body = await req.json();
  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Verify user is part of this chat
  const { data: chat } = await supabaseAdmin
    .from("chats")
    .select("user1_id, user2_id")
    .eq("id", parsed.data.chat_id)
    .single();

  if (!chat || (chat.user1_id !== user.id && chat.user2_id !== user.id)) {
    return NextResponse.json({ error: "Chat not found or access denied" }, { status: 403 });
  }

  const { data, error } = await sendMessage(
    parsed.data.chat_id,
    user.id,
    parsed.data.message,
    parsed.data.type
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const recipientId = chat.user1_id === user.id ? chat.user2_id : chat.user1_id;

  // Real-time delivery
  try {
    emitChatMessage(recipientId, data);
  } catch {}

  // Notification for offline users
  await createNotification({
    user_id: recipientId,
    type: "chat",
    title: "New message",
    body: parsed.data.type === "image" ? "📷 Image" : parsed.data.message.slice(0, 80),
    meta: { chat_id: parsed.data.chat_id },
  });

  return NextResponse.json({ message: data }, { status: 201 });
});

// GET /api/chat/send?chat_id=xxx&limit=50&before=iso
export const GET = withAuth(async (req: NextRequest, user) => {
  const { searchParams } = new URL(req.url);
  const chatId = searchParams.get("chat_id");
  if (!chatId) return NextResponse.json({ error: "chat_id required" }, { status: 400 });

  const chat = await supabaseAdmin
    .from("chats")
    .select("user1_id, user2_id")
    .eq("id", chatId)
    .single();

  if (
    !chat.data ||
    (chat.data.user1_id !== user.id && chat.data.user2_id !== user.id)
  ) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const limit = parseInt(searchParams.get("limit") ?? "50");
  const before = searchParams.get("before") ?? undefined;

  const { data, error } = await getChatMessages(chatId, limit, before);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ messages: data });
});
