import { supabaseAdmin } from "@/lib/supabase/server";

export async function getUserById(id: string) {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, username, bio, profile_photo, trust_score, interests, is_admin, created_at")
    .eq("id", id)
    .single();
  return { data, error };
}

export async function updateUser(
  id: string,
  updates: Partial<{
    username: string;
    bio: string;
    profile_photo: string;
    interests: string[];
  }>
) {
  const { data, error } = await supabaseAdmin
    .from("users")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  return { data, error };
}

export async function getEmergencyContacts(userId: string) {
  return supabaseAdmin
    .from("emergency_contacts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
}

export async function upsertEmergencyContact(
  userId: string,
  contact: {
    contact_name: string;
    relationship: string;
    phone_number: string;
  }
) {
  return supabaseAdmin.from("emergency_contacts").insert({
    user_id: userId,
    ...contact,
  });
}

export async function banUser(id: string) {
  return supabaseAdmin
    .from("users")
    .update({ is_banned: true })
    .eq("id", id);
}
