import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/verify";
import { createSignal } from "@/lib/db/signals";
import { createSignalSchema } from "@/lib/validations/signal";
import { signalCreateLimiter, checkRateLimit } from "@/lib/ratelimit";
import { assertWithinIndia, reverseGeocode } from "@/lib/mappls/client";

// Check if signal creation is enabled
async function isSignalCreationEnabled() {
  const { supabaseAdmin } = await import("@/lib/supabase/server");
  const { data } = await supabaseAdmin
    .from("feature_toggles")
    .select("enabled")
    .eq("key", "signal_creation")
    .single();
  return data?.enabled !== false;
}

export const POST = withAuth(async (req: NextRequest, user) => {
  const limited = await checkRateLimit(signalCreateLimiter, req, user.id);
  if (limited) return limited;

  if (!(await isSignalCreationEnabled())) {
    return NextResponse.json(
      { error: "Signal creation is currently disabled" },
      { status: 503 }
    );
  }

  const body = await req.json();
  const parsed = createSignalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // ── India-only check via Mappls ───────────────────────────────────────────
  try {
    assertWithinIndia(parsed.data.latitude, parsed.data.longitude);
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === "OUTSIDE_INDIA") {
      return NextResponse.json(
        { error: e.message, code: "OUTSIDE_INDIA" },
        { status: 422 }
      );
    }
    throw err;
  }

  // ── Auto-fill location_name from Mappls if not provided precisely ─────────
  let locationName = parsed.data.location_name;
  if (!locationName || locationName.trim().length < 5) {
    try {
      const geocoded = await reverseGeocode(
        parsed.data.latitude,
        parsed.data.longitude
      );
      locationName =
        [geocoded.subLocality, geocoded.locality, geocoded.city]
          .filter(Boolean)
          .join(", ") || geocoded.formattedAddress;
    } catch {
      // Non-fatal: keep the user-provided value
    }
  }

  const { data, error } = await createSignal({
    ...parsed.data,
    location_name: locationName,
    creator_id: user.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Emit WebSocket event to nearby users (best-effort)
  try {
    const { emitSignalCreated } = await import("@/lib/websocket/server");
    emitSignalCreated([], data);
  } catch {}

  return NextResponse.json({ signal: data }, { status: 201 });
});
