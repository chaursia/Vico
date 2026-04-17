import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/verify";
import {
  reverseGeocode,
  getNearbyPlaces,
  searchPlaces,
  isWithinIndia,
} from "@/lib/mappls/client";
import { apiLimiter, checkRateLimit } from "@/lib/ratelimit";
import { z } from "zod";

const reverseGeocodeSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

const nearbySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  keyword: z.string().min(1).max(100).default("place"),
  radius: z.coerce.number().int().min(100).max(25000).default(1000),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const searchSchema = z.object({
  q: z.string().min(2).max(200),
  limit: z.coerce.number().int().min(1).max(20).default(5),
});

/**
 * GET /api/location/reverse?lat=&lng=
 * Reverse geocode a coordinate to an Indian address.
 *
 * GET /api/location/nearby?lat=&lng=&keyword=&radius=&limit=
 * Find nearby places in India around a coordinate.
 *
 * GET /api/location/search?q=&limit=
 * Text search for a place within India.
 *
 * GET /api/location/validate?lat=&lng=
 * Check if coordinates are within India (public-safe check).
 */
export const GET = withAuth(async (req: NextRequest, user) => {
  const limited = await checkRateLimit(apiLimiter, req, user.id);
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") ?? "reverse";

  try {
    switch (action) {
      case "reverse": {
        const parsed = reverseGeocodeSchema.safeParse({
          lat: searchParams.get("lat"),
          lng: searchParams.get("lng"),
        });
        if (!parsed.success) {
          return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
        }
        const result = await reverseGeocode(parsed.data.lat, parsed.data.lng);
        return NextResponse.json({ address: result });
      }

      case "nearby": {
        const parsed = nearbySchema.safeParse({
          lat: searchParams.get("lat"),
          lng: searchParams.get("lng"),
          keyword: searchParams.get("keyword") ?? "place",
          radius: searchParams.get("radius"),
          limit: searchParams.get("limit"),
        });
        if (!parsed.success) {
          return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
        }
        const places = await getNearbyPlaces(
          parsed.data.lat,
          parsed.data.lng,
          parsed.data.keyword,
          parsed.data.radius,
          parsed.data.limit
        );
        return NextResponse.json({ places, count: places.length });
      }

      case "search": {
        const parsed = searchSchema.safeParse({
          q: searchParams.get("q"),
          limit: searchParams.get("limit"),
        });
        if (!parsed.success) {
          return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
        }
        const results = await searchPlaces(parsed.data.q, parsed.data.limit);
        return NextResponse.json({ results, count: results.length });
      }

      case "validate": {
        const lat = parseFloat(searchParams.get("lat") ?? "");
        const lng = parseFloat(searchParams.get("lng") ?? "");
        if (isNaN(lat) || isNaN(lng)) {
          return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
        }
        const isIndia = isWithinIndia(lat, lng);
        return NextResponse.json({
          within_india: isIndia,
          message: isIndia
            ? "Coordinates are within India"
            : "Vico is available in India only",
        });
      }

      default:
        return NextResponse.json(
          {
            error: "Invalid action. Use: reverse | nearby | search | validate",
          },
          { status: 400 }
        );
    }
  } catch (err) {
    const error = err as Error & { code?: string; status?: number };
    if (error.code === "OUTSIDE_INDIA") {
      return NextResponse.json(
        { error: error.message, code: "OUTSIDE_INDIA" },
        { status: 422 }
      );
    }
    console.error("[Location API]", err);
    return NextResponse.json({ error: "Location service error" }, { status: 500 });
  }
});
