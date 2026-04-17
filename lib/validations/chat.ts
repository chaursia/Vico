import { z } from "zod";

export const sendMessageSchema = z.object({
  chat_id: z.string().uuid(),
  message: z.string().min(1).max(2000),
  type: z.enum(["text", "image"]).default("text"),
});

export const sendRoomMessageSchema = z.object({
  message: z.string().min(1).max(2000),
  type: z.enum(["text", "notice"]).default("text"),
});

export const openChatSchema = z.object({
  user_id: z.string().uuid(), // the other user
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type SendRoomMessageInput = z.infer<typeof sendRoomMessageSchema>;
