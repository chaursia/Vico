import { Server as SocketIOServer, Socket } from "socket.io";
import { supabaseAdmin } from "@/lib/supabase/server";

let io: SocketIOServer | null = null;

export function initWebSocket(httpServer: import("http").Server) {
  if (io) return io;

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL ?? "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("Authentication required"));

    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) return next(new Error("Invalid token"));

    socket.data.userId = user.id;
    next();
  });

  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId as string;
    console.log(`[WS] User connected: ${userId}`);

    // Each user joins their personal room for DMs
    socket.join(`user:${userId}`);

    // Join a signal room
    socket.on("join_signal_room", async (signalId: string) => {
      // Verify user is a participant
      const { data } = await supabaseAdmin
        .from("signal_participants")
        .select("id")
        .eq("signal_id", signalId)
        .eq("user_id", userId)
        .eq("status", "joined")
        .maybeSingle();

      if (data) {
        socket.join(`signal:${signalId}`);
        socket.emit("joined_room", { signalId });
      } else {
        socket.emit("error", { message: "Not a participant of this signal" });
      }
    });

    socket.on("leave_signal_room", (signalId: string) => {
      socket.leave(`signal:${signalId}`);
    });

    socket.on("disconnect", () => {
      console.log(`[WS] User disconnected: ${userId}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}

// ─── Emitter helpers (called from API routes) ────────────────────────────────

export function emitSignalCreated(nearbyUserIds: string[], signal: unknown) {
  const server = getIO();
  for (const uid of nearbyUserIds) {
    server.to(`user:${uid}`).emit("signal_created", signal);
  }
}

export function emitSignalJoined(signalId: string, participant: unknown) {
  getIO().to(`signal:${signalId}`).emit("signal_joined", participant);
}

export function emitSignalNotice(signalId: string, notice: unknown) {
  getIO().to(`signal:${signalId}`).emit("signal_notice", notice);
}

export function emitChatMessage(toUserId: string, message: unknown) {
  getIO().to(`user:${toUserId}`).emit("chat_message", message);
}

export function emitSignalCompleted(signalId: string) {
  getIO().to(`signal:${signalId}`).emit("signal_completed", { signalId });
}

export function emitSafetyCheck(userId: string, payload: unknown) {
  getIO().to(`user:${userId}`).emit("safety_check", payload);
}
