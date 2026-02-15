import { NextRequest, NextResponse } from "next/server";
import { stripe, getSubscriptionPeriodEnd } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId } = body;

    if (!customerId || typeof customerId !== "string") {
      return NextResponse.json(
        { active: false, error: "Missing customer ID" },
        { status: 400 }
      );
    }

    if (!customerId.startsWith("cus_")) {
      return NextResponse.json(
        { active: false, error: "Invalid customer ID" },
        { status: 400 }
      );
    }

    // Check active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length > 0) {
      return NextResponse.json({
        active: true,
        premiumUntil: getSubscriptionPeriodEnd(subscriptions.data[0]),
      });
    }

    // Also check trialing status
    const trialSubs = await stripe.subscriptions.list({
      customer: customerId,
      status: "trialing",
      limit: 1,
    });

    if (trialSubs.data.length > 0) {
      return NextResponse.json({
        active: true,
        premiumUntil: getSubscriptionPeriodEnd(trialSubs.data[0]),
      });
    }

    return NextResponse.json({ active: false });
  } catch (err) {
    console.error("Subscription status error:", err);
    return NextResponse.json(
      { active: false, error: "Could not verify subscription" },
      { status: 500 }
    );
  }
}
