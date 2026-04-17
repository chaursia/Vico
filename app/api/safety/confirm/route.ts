import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/verify";
import { supabaseAdmin } from "@/lib/supabase/server";
import { z } from "zod";

const confirmSchema = z.object({
  signal_id: z.string().uuid(),
  status: z.enum(["safe", "unsafe"]),
});

export const POST = withAuth(async (req: NextRequest, user) => {
  const body = await req.json();
  const parsed = confirmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { signal_id, status } = parsed.data;

  const { data: check } = await supabaseAdmin
    .from("safety_checks")
    .select("id")
    .eq("signal_id", signal_id)
    .eq("user_id", user.id)
    .is("acknowledged_at", null)
    .maybeSingle();

  if (!check) {
    return NextResponse.json(
      { error: "No pending safety check found" },
      { status: 404 }
    );
  }

  await supabaseAdmin
    .from("safety_checks")
    .update({
      acknowledged_at: new Date().toISOString(),
      status,
    })
    .eq("id", check.id);

  if (status === "unsafe") {
    // Immediately notify emergency contacts (don't wait for scheduler)
    const { data: contacts } = await supabaseAdmin
      .from("emergency_contacts")
      .select("contact_name, phone_number")
      .eq("user_id", user.id);

    // TODO: Integrate SMS provider (e.g., Twilio)
    console.warn(
      `[SAFETY] User ${user.id} reported UNSAFE. Emergency contacts:`,
      contacts
    );

    await supabaseAdmin.from("safety_checks").update({ emergency_notified: true }).eq("id", check.id);
  }

  return NextResponse.json({ message: `Safety status recorded: ${status}` });
});
