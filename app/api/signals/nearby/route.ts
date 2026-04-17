import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/verify";
import { getNearbySignals } from "@/lib/db/signals";
import { nearbyQuerySchema } from "@/lib/validations/signal";
import { apiLimiter, checkRateLimit } from "@/lib/ratelimit";
import { isWithinIndia } from "@/lib/mappls/client";

export const GET = withAuth(async (req: NextRequest, user) => {
  const limited = await checkRateLimit(apiLimiter, req, user.id);
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const parsed = nearbyQuerySchema.safeParse({
    lat: searchParams.get("lat"),
    lng: searchParams.get("lng"),
    radius: searchParams.get("radius"),
    limit: searchParams.get("limit"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { lat, lng, radius, limit } = parsed.data;

  // ── Reject radar calls from outside India ─────────────────────────────────
  if (!isWithinIndia(lat, lng)) {
    return NextResponse.json(
      {
        error: "Vico is available in India only. Your coordinates are outside India.",
        code: "OUTSIDE_INDIA",
        signals: [],
        count: 0,
      },
      { status: 422 }
    );
  }

  const { data, error } = await getNearbySignals(lat, lng, radius, limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fuzz exact coordinates for privacy (approximate to ~100m)
  const fuzzed = (data ?? []).map((s: Record<string, unknown>) => ({
    ...s,
    latitude: Math.round((s.latitude as number) * 1000) / 1000,
    longitude: Math.round((s.longitude as number) * 1000) / 1000,
  }));

  return NextResponse.json({
    signals: fuzzed,
    count: fuzzed.length,
    radius_km: radius,
    region: "IND",
  });
});
