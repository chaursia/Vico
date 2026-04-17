/**
 * Mappls (MapmyIndia) REST API Client
 * India-only geolocation services — replaces Radar SDK
 *
 * Docs:   https://about.mappls.com/api/
 * Repo:   https://github.com/mappls-api/mappls-rest-apis
 * Auth:   Authorization: Bearer <api_key>  (August 2025+ auth mechanism)
 *         Get your key at: https://auth.mappls.com/console/
 *
 * Coverage: India + Srilanka, Nepal, Bhutan, Myanmar, Bangladesh
 * Primary focus for Vico: India only (coordinates validated below)
 */

const MAPPLS_API_KEY = process.env.MAPPLS_API_KEY;
const MAPPLS_BASE = "https://apis.mappls.com/advancedmaps/v1";

// ─── India Bounding Box ───────────────────────────────────────────────────────
// Approximate bounding box for Republic of India (incl. A&N Islands, Lakshadweep)
const INDIA_BOUNDS = {
  minLat: 6.4627,
  maxLat: 37.0841,
  minLng: 68.1097,
  maxLng: 97.4026,
};

/**
 * Check whether a coordinate pair falls within India's bounding box.
 * Used to reject signals created outside India.
 */
export function isWithinIndia(latitude: number, longitude: number): boolean {
  return (
    latitude >= INDIA_BOUNDS.minLat &&
    latitude <= INDIA_BOUNDS.maxLat &&
    longitude >= INDIA_BOUNDS.minLng &&
    longitude <= INDIA_BOUNDS.maxLng
  );
}

// ─── Type Definitions ─────────────────────────────────────────────────────────

export interface MapplsGeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  area: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  country: string;
  houseNumber?: string;
  houseName?: string;
  street?: string;
  subLocality?: string;
  locality?: string;
}

export interface MapplsNearbyPlace {
  placeId: string;
  placeName: string;
  address: string;
  latitude: number;
  longitude: number;
  type: string;
  distance: number; // metres
  city?: string;
}

export interface MapplsPlaceSuggestion {
  eLoc: string;
  placeName: string;
  placeAddress: string;
  type: string;
}

// ─── Auth Header Builder ──────────────────────────────────────────────────────

function getAuthHeaders(): Record<string, string> {
  if (!MAPPLS_API_KEY) {
    throw new Error("[Mappls] MAPPLS_API_KEY environment variable is not set");
  }
  return {
    Authorization: `Bearer ${MAPPLS_API_KEY}`,
    "Content-Type": "application/json",
  };
}

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * Reverse geocode a lat/lng coordinate to a human-readable Indian address.
 * Endpoint: GET /rev_geocode?lat=&lng=
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<MapplsGeocodeResult> {
  if (!isWithinIndia(latitude, longitude)) {
    throw new Error(
      `[Mappls] Coordinates (${latitude}, ${longitude}) are outside India. ` +
        `Vico is India-only.`
    );
  }

  const url = `${MAPPLS_BASE}/rev_geocode?lat=${latitude}&lng=${longitude}`;
  const res = await fetch(url, { headers: getAuthHeaders() });

  if (!res.ok) {
    throw new Error(
      `[Mappls] Reverse geocode failed: ${res.status} ${res.statusText}`
    );
  }

  const data = await res.json();
  const result = data?.results?.[0];

  if (!result) {
    throw new Error("[Mappls] No address found for these coordinates");
  }

  return {
    latitude,
    longitude,
    formattedAddress: result.formatted_address ?? `${latitude}, ${longitude}`,
    area: result.area ?? "",
    city: result.city ?? "",
    district: result.district ?? "",
    state: result.state ?? "",
    pincode: result.pincode ?? "",
    country: result.country ?? "India",
    houseNumber: result.houseNumber,
    houseName: result.houseName,
    street: result.street,
    subLocality: result.subLocality,
    locality: result.locality,
  };
}

/**
 * Search for nearby places around a coordinate.
 * Endpoint: GET /nearby?keywords=<keyword>&refLocation=<lat>,<lng>&radius=<m>&page=1&region=IND
 *
 * @param latitude   Centre latitude
 * @param longitude  Centre longitude
 * @param keyword    Place category/keyword e.g. "restaurant", "hospital", "park"
 * @param radiusM    Search radius in metres (default 1000, max 25000)
 * @param limit      Max results (default 10, max 50)
 */
export async function getNearbyPlaces(
  latitude: number,
  longitude: number,
  keyword = "place",
  radiusM = 1000,
  limit = 10
): Promise<MapplsNearbyPlace[]> {
  if (!isWithinIndia(latitude, longitude)) {
    return []; // silently return empty outside India
  }

  const params = new URLSearchParams({
    keywords: keyword,
    refLocation: `${latitude},${longitude}`,
    radius: String(Math.min(radiusM, 25000)),
    page: "1",
    region: "IND",
  });

  const url = `${MAPPLS_BASE}/nearby?${params}`;
  const res = await fetch(url, { headers: getAuthHeaders() });

  if (!res.ok) {
    console.error(`[Mappls] Nearby places error: ${res.status} ${res.statusText}`);
    return [];
  }

  const data = await res.json();
  const suggestions: MapplsNearbyPlace[] = (data?.suggestedLocations ?? [])
    .slice(0, limit)
    .map(
      (p: Record<string, unknown>) => ({
        placeId: String(p.eLoc ?? ""),
        placeName: String(p.placeName ?? ""),
        address: String(p.placeAddress ?? ""),
        latitude: Number((p.latitude as string)?.split(",")[0] ?? latitude),
        longitude: Number((p.longitude as string)?.split(",")[0] ?? longitude),
        type: String(p.type ?? ""),
        distance: Number(p.distance ?? 0),
        city: String(p.city ?? ""),
      })
    );

  return suggestions;
}

/**
 * Text-search for a place by name/address within India.
 * Endpoint: GET /textsearch?query=&region=IND
 *
 * Useful for validating or auto-completing user-entered location names.
 */
export async function searchPlaces(
  query: string,
  limit = 5
): Promise<MapplsPlaceSuggestion[]> {
  const params = new URLSearchParams({
    query,
    region: "IND",
  });

  const url = `${MAPPLS_BASE}/textsearch?${params}`;
  const res = await fetch(url, { headers: getAuthHeaders() });

  if (!res.ok) {
    console.error(`[Mappls] Text search error: ${res.status} ${res.statusText}`);
    return [];
  }

  const data = await res.json();
  return (data?.suggestedLocations ?? []).slice(0, limit).map(
    (p: Record<string, unknown>) => ({
      eLoc: String(p.eLoc ?? ""),
      placeName: String(p.placeName ?? ""),
      placeAddress: String(p.placeAddress ?? ""),
      type: String(p.type ?? ""),
    })
  );
}

/**
 * Retrieve full place details by eLoc (Mappls place ID).
 * Endpoint: GET /place_detail?place_id=<eLoc>
 */
export async function getPlaceDetails(
  eLoc: string
): Promise<Record<string, unknown> | null> {
  const url = `${MAPPLS_BASE}/place_detail?place_id=${eLoc}`;
  const res = await fetch(url, { headers: getAuthHeaders() });

  if (!res.ok) {
    console.error(`[Mappls] Place detail error: ${res.status} ${res.statusText}`);
    return null;
  }

  const data = await res.json();
  return data ?? null;
}

/**
 * Validate that the given coordinates are within India's bounds.
 * Throws a descriptive error if not — used in API route validation.
 */
export function assertWithinIndia(latitude: number, longitude: number): void {
  if (!isWithinIndia(latitude, longitude)) {
    throw Object.assign(
      new Error(
        `Vico is available in India only. Coordinates (${latitude.toFixed(4)}, ${longitude.toFixed(4)}) are outside India's region.`
      ),
      { code: "OUTSIDE_INDIA", status: 422 }
    );
  }
}
