import cron from "node-cron";
import { expireOldSignals } from "@/lib/db/signals";
import { closeExpiredRooms } from "@/lib/db/chat";
import { supabaseAdmin } from "@/lib/supabase/server";
import { emitSafetyCheck } from "@/lib/websocket/server";

export function startScheduler() {
  console.log("[Scheduler] Starting background jobs...");

  // ── Every 1 minute: expire signals ────────────────────────────────────────
  cron.schedule("* * * * *", async () => {
    try {
      const { error } = await expireOldSignals();
      if (error) console.error("[Scheduler] expire signals:", error.message);
    } catch (e) {
      console.error("[Scheduler] expire signals exception:", e);
    }
  });

  // ── Every 5 minutes: close event chat rooms post-signal-expiry ────────────
  cron.schedule("*/5 * * * *", async () => {
    try {
      await closeExpiredRooms();
    } catch (e) {
      console.error("[Scheduler] close rooms exception:", e);
    }
  });

  // ── Every 5 minutes: trigger safety checks for newly completed signals ─────
  cron.schedule("*/5 * * * *", async () => {
    try {
      await triggerSafetyChecks();
    } catch (e) {
      console.error("[Scheduler] safety check trigger exception:", e);
    }
  });

  // ── Every 10 minutes: send reminders for unacknowledged safety checks ──────
  cron.schedule("*/10 * * * *", async () => {
    try {
      await sendSafetyReminders();
    } catch (e) {
      console.error("[Scheduler] safety reminder exception:", e);
    }
  });

  // ── Every 15 minutes: notify emergency contacts if still unacknowledged ────
  cron.schedule("*/15 * * * *", async () => {
    try {
      await notifyEmergencyContacts();
    } catch (e) {
      console.error("[Scheduler] emergency contact exception:", e);
    }
  });

  // ── Daily at 3am: clean up data older than 90 days ────────────────────────
  cron.schedule("0 3 * * *", async () => {
    try {
      await cleanupOldData();
    } catch (e) {
      console.error("[Scheduler] cleanup exception:", e);
    }
  });

  console.log("[Scheduler] All jobs registered ✓");
}

// ─── Job implementations ─────────────────────────────────────────────────────

async function triggerSafetyChecks() {
  // Find signals completed in the last 5 minutes without a safety check
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  const { data: signals } = await supabaseAdmin
    .from("signals")
    .select("id, creator_id, safety_check_time, signal_participants(user_id)")
    .eq("status", "completed")
    .gte("updated_at", fiveMinutesAgo)
    .lte("updated_at", now);

  if (!signals?.length) return;

  for (const signal of signals) {
    const participants = (
      signal.signal_participants as { user_id: string }[]
    ).map((p) => p.user_id);
    const allUsers = [signal.creator_id, ...participants];

    for (const userId of allUsers) {
      // Check if already created
      const { data: existing } = await supabaseAdmin
        .from("safety_checks")
        .select("id")
        .eq("signal_id", signal.id)
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) continue;

      await supabaseAdmin.from("safety_checks").insert({
        signal_id: signal.id,
        user_id: userId,
      });

      // Emit WS event
      emitSafetyCheck(userId, { signal_id: signal.id });

      // Create notification
      await supabaseAdmin.from("notifications").insert({
        user_id: userId,
        type: "safety_check",
        title: "Safety Check",
        body: "Are you safe? Please confirm your safety status.",
      });
    }
  }
}

async function sendSafetyReminders() {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { data: checks } = await supabaseAdmin
    .from("safety_checks")
    .select("id, user_id, signal_id, reminder_sent")
    .is("acknowledged_at", null)
    .lt("created_at", tenMinutesAgo)
    .eq("reminder_sent", false);

  if (!checks?.length) return;

  for (const check of checks) {
    emitSafetyCheck(check.user_id, {
      signal_id: check.signal_id,
      is_reminder: true,
    });

    await supabaseAdmin
      .from("safety_checks")
      .update({ reminder_sent: true })
      .eq("id", check.id);
  }
}

async function notifyEmergencyContacts() {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  const { data: checks } = await supabaseAdmin
    .from("safety_checks")
    .select("id, user_id, signal_id, emergency_notified")
    .is("acknowledged_at", null)
    .lt("created_at", thirtyMinutesAgo)
    .eq("emergency_notified", false);

  if (!checks?.length) return;

  for (const check of checks) {
    const { data: contacts } = await supabaseAdmin
      .from("emergency_contacts")
      .select("contact_name, phone_number")
      .eq("user_id", check.user_id);

    if (contacts?.length) {
      // TODO: Integrate SMS provider (Twilio, etc.) to send real SMS
      console.warn(
        `[SAFETY] Emergency contact notification needed for user ${check.user_id}`,
        contacts.map((c) => c.phone_number)
      );
    }

    await supabaseAdmin
      .from("safety_checks")
      .update({ emergency_notified: true })
      .eq("id", check.id);
  }
}

async function cleanupOldData() {
  const ninetyDaysAgo = new Date(
    Date.now() - 90 * 24 * 60 * 60 * 1000
  ).toISOString();

  await supabaseAdmin
    .from("notifications")
    .delete()
    .lt("created_at", ninetyDaysAgo);

  await supabaseAdmin
    .from("audit_logs")
    .delete()
    .lt("created_at", ninetyDaysAgo);

  await supabaseAdmin
    .from("room_messages")
    .delete()
    .lt("created_at", ninetyDaysAgo);

  console.log("[Scheduler] Cleanup complete: deleted data older than 90 days");
}
