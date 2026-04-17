import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * Fetch signals within a given radius using PostGIS ST_DWithin.
 * @param lat  User latitude
 * @param lng  User longitude
 * @param radiusKm  Search radius in kilometres (default 10)
 * @param limit  Max results (default 50)
 */
export async function getNearbySignals(
  lat: number,
  lng: number,
  radiusKm = 10,
  limit = 50
) {
  // PostGIS ST_DWithin with geography type uses metres
  const radiusMetres = radiusKm * 1000;
  const { data, error } = await supabaseAdmin.rpc("get_nearby_signals", {
    user_lat: lat,
    user_lng: lng,
    radius_metres: radiusMetres,
    result_limit: limit,
  });
  return { data, error };
}

export async function createSignal(payload: {
  creator_id: string;
  title: string;
  description: string;
  category: string;
  latitude: number;
  longitude: number;
  location_name: string;
  duration: number; // minutes
  slots: number;
  safety_check_time: number; // minutes after expiry
}) {
  const expiresAt = new Date(Date.now() + payload.duration * 60 * 1000);
  return supabaseAdmin
    .from("signals")
    .insert({
      ...payload,
      expires_at: expiresAt.toISOString(),
      status: "active",
    })
    .select()
    .single();
}

export async function getSignalById(id: string) {
  return supabaseAdmin
    .from("signals")
    .select("*, signal_participants(count)")
    .eq("id", id)
    .single();
}

export async function joinSignal(signalId: string, userId: string) {
  // Check slot availability first
  const { data: signal } = await supabaseAdmin
    .from("signals")
    .select("slots, status, expires_at")
    .eq("id", signalId)
    .single();

  if (!signal) return { error: "Signal not found" };
  if (signal.status !== "active") return { error: "Signal is not active" };
  if (new Date(signal.expires_at) < new Date()) return { error: "Signal has expired" };

  const { count } = await supabaseAdmin
    .from("signal_participants")
    .select("*", { count: "exact", head: true })
    .eq("signal_id", signalId)
    .eq("status", "joined");

  if ((count ?? 0) >= signal.slots) return { error: "Signal is full" };

  return supabaseAdmin
    .from("signal_participants")
    .upsert({ signal_id: signalId, user_id: userId, status: "joined" })
    .select()
    .single();
}

export async function completeSignal(signalId: string, hostId: string) {
  const { data: signal } = await supabaseAdmin
    .from("signals")
    .select("creator_id")
    .eq("id", signalId)
    .single();

  if (!signal || signal.creator_id !== hostId) {
    return { error: "Only the host can complete this signal" };
  }

  return supabaseAdmin
    .from("signals")
    .update({ status: "completed" })
    .eq("id", signalId)
    .select()
    .single();
}

export async function expireOldSignals() {
  return supabaseAdmin
    .from("signals")
    .update({ status: "expired" })
    .eq("status", "active")
    .lt("expires_at", new Date().toISOString());
}

export async function getSignalParticipants(signalId: string) {
  return supabaseAdmin
    .from("signal_participants")
    .select("*, users(id, username, profile_photo, trust_score)")
    .eq("signal_id", signalId)
    .eq("status", "joined");
}
