import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/** Extract current_period_end from a subscription (lives on items in SDK v20+) */
export function getSubscriptionPeriodEnd(sub: Stripe.Subscription): string {
  const item = sub.items?.data?.[0];
  if (item?.current_period_end) {
    return new Date(item.current_period_end * 1000).toISOString();
  }
  // Fallback: 35 days from now (generous buffer for monthly)
  return new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString();
}
