import Stripe from "stripe";

// Lazy-initialized — only throws at runtime when Stripe routes are hit,
// not at server startup. Allows running locally without Stripe keys.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.startsWith("sk_test_...")) {
    throw new Error(
      "[Stripe] STRIPE_SECRET_KEY is not configured. " +
        "Get your key from https://dashboard.stripe.com/apikeys"
    );
  }

  _stripe = new Stripe(key, {
    apiVersion: "2026-03-25.dahlia",
    typescript: true,
  });

  return _stripe;
}

// Keep named export for convenience — same lazy pattern
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const PLANS = {
  basic: {
    name: "Vico Basic",
    priceId: process.env.STRIPE_BASIC_PRICE_ID ?? "",
    features: ["Up to 5 active signals", "Basic radar (5km)", "Chat"],
  },
  premium: {
    name: "Vico Premium",
    priceId: process.env.STRIPE_PREMIUM_PRICE_ID ?? "",
    features: [
      "Unlimited active signals",
      "Extended radar (15km)",
      "Priority chat",
      "Advanced safety features",
    ],
  },
} as const;

export type PlanKey = keyof typeof PLANS;
