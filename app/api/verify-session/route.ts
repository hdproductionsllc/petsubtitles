import { NextRequest, NextResponse } from "next/server";
import { stripe, getSubscriptionPeriodEnd } from "@/lib/stripe";
import type Stripe from "stripe";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { active: false, error: "Missing session ID" },
        { status: 400 }
      );
    }

    if (!sessionId.startsWith("cs_")) {
      return NextResponse.json(
        { active: false, error: "Invalid session ID" },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    if (session.payment_status !== "paid") {
      return NextResponse.json({ active: false });
    }

    const subscription = session.subscription as Stripe.Subscription;
    if (!subscription) {
      return NextResponse.json({ active: false });
    }

    return NextResponse.json({
      active: true,
      email: session.customer_email || session.customer_details?.email || "",
      customerId:
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id ?? "",
      premiumUntil: getSubscriptionPeriodEnd(subscription),
    });
  } catch (err) {
    console.error("Session verification error:", err);
    return NextResponse.json(
      { active: false, error: "Could not verify session" },
      { status: 500 }
    );
  }
}
