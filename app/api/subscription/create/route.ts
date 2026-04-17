import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/verify";
import { stripe, PLANS, PlanKey } from "@/lib/stripe/client";
import { supabaseAdmin } from "@/lib/supabase/server";
import { z } from "zod";

const createSchema = z.object({
  plan: z.enum(["basic", "premium"]),
});

export const POST = withAuth(async (req: NextRequest, user) => {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { plan } = parsed.data;
  const planConfig = PLANS[plan as PlanKey];

  // Check for existing Stripe customer
  let stripeCustomerId: string;
  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (sub?.stripe_customer_id) {
    stripeCustomerId = sub.stripe_customer_id;
  } else {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { vico_user_id: user.id },
    });
    stripeCustomerId = customer.id;
  }

  // Create Stripe Checkout session
  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    payment_method_types: ["card"],
    line_items: [{ price: planConfig.priceId, quantity: 1 }],
    mode: "subscription",
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription/cancel`,
    metadata: { user_id: user.id, plan },
  });

  return NextResponse.json({ checkout_url: session.url, session_id: session.id });
});
