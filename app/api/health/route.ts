import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  const start = Date.now();
  let dbOk = false;

  try {
    await supabaseAdmin.from("users").select("id").limit(1);
    dbOk = true;
  } catch {}

  return NextResponse.json({
    status: dbOk ? "ok" : "degraded",
    service: "vico-api",
    version: "1.0.0",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    latency_ms: Date.now() - start,
    region: "IND",
    integrations: {
      supabase: dbOk ? "connected" : "error",
      mappls: process.env.MAPPLS_API_KEY ? "configured" : "missing_key",
    },
  });
}
