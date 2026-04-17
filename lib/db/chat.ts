import { supabaseAdmin } from "@/lib/supabase/server";

// ─── Personal Chat ───────────────────────────────────────────────────────────

export async function getOrCreateChat(user1Id: string, user2Id: string) {
  // Check for existing chat (either direction)
  const { data: existing } = await supabaseAdmin
    .from("chats")
    .select("*")
    .or(
      `and(user1_id.eq.${user1Id},user2_id.eq.${user2Id}),and(user1_id.eq.${user2Id},user2_id.eq.${user1Id})`
    )
    .maybeSingle();

  if (existing) return { data: existing, error: null };

  return supabaseAdmin
    .from("chats")
    .insert({ user1_id: user1Id, user2_id: user2Id })
    .select()
    .single();
}

export async function getUserChats(userId: string) {
  return supabaseAdmin
    .from("chats")
    .select(
      `*, 
      user1:users!chats_user1_id_fkey(id, username, profile_photo),
      user2:users!chats_user2_id_fkey(id, username, profile_photo),
      messages(message, type, created_at, sender_id)`
    )
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .order("created_at", { referencedTable: "messages", ascending: false })
    .limit(1, { referencedTable: "messages" });
}

export async function getChatMessages(chatId: string, limit = 50, before?: string) {
  let query = supabaseAdmin
    .from("messages")
    .select("*, sender:users!messages_sender_id_fkey(id, username, profile_photo)")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) query = query.lt("created_at", before);

  return query;
}

export async function sendMessage(
  chatId: string,
  senderId: string,
  message: string,
  type: "text" | "image" | "notice" = "text"
) {
  return supabaseAdmin
    .from("messages")
    .insert({ chat_id: chatId, sender_id: senderId, message, type })
    .select()
    .single();
}

// ─── Event Chat Rooms ────────────────────────────────────────────────────────

export async function getOrCreateRoom(signalId: string, expiresAt: string) {
  const { data: existing } = await supabaseAdmin
    .from("signal_rooms")
    .select("*")
    .eq("signal_id", signalId)
    .maybeSingle();

  if (existing) return { data: existing, error: null };

  return supabaseAdmin
    .from("signal_rooms")
    .insert({ signal_id: signalId, expires_at: expiresAt })
    .select()
    .single();
}

export async function getRoomMessages(roomId: string, limit = 50) {
  return supabaseAdmin
    .from("room_messages")
    .select("*, sender:users!room_messages_sender_id_fkey(id, username, profile_photo)")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(limit);
}

export async function sendRoomMessage(
  roomId: string,
  senderId: string,
  message: string,
  type: "text" | "notice" | "system" = "text"
) {
  return supabaseAdmin
    .from("room_messages")
    .insert({ room_id: roomId, sender_id: senderId, message, type })
    .select()
    .single();
}

export async function closeExpiredRooms() {
  const { data: rooms } = await supabaseAdmin
    .from("signal_rooms")
    .select("id, signal_id")
    .lt("expires_at", new Date().toISOString())
    .eq("is_closed", false);

  if (!rooms?.length) return;

  const ids = rooms.map((r) => r.id);
  return supabaseAdmin
    .from("signal_rooms")
    .update({ is_closed: true })
    .in("id", ids);
}
