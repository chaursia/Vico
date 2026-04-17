/**
 * Custom Node.js server — wraps Next.js with Socket.IO support.
 * Run with: npm run dev  (uses tsx)
 * Production: npm start
 */

// Load .env.local FIRST — before any lib imports that read process.env
import { config } from "dotenv";
config({ path: ".env.local" });

import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { initWebSocket } from "./lib/websocket/server";
import { startScheduler } from "./lib/jobs/scheduler";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT ?? "3000", 10);

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  // Attach Socket.IO
  initWebSocket(httpServer);

  // Start background job scheduler
  startScheduler();

  httpServer.listen(port, () => {
    console.log(`\n🚀 Vico server running at http://localhost:${port}`);
    console.log(`📡 WebSocket server ready`);
    console.log(`⏰ Background scheduler active`);
    console.log(`🌍 Mode: ${dev ? "development" : "production"}\n`);
  });
});
