import { NextRequest, NextResponse } from "next/server";
import { stripe, getSubscriptionPeriodEnd } from "@/lib/stripe";

// Rate limiting to prevent email enumeration
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { found: false, error: "Too many attempts. Please wait a minute." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { found: false, error: "Email is required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { found: false, error: "Invalid email format" },
        { status: 400 }
      );
    }

    const customers = await stripe.customers.list({
      email: email.toLowerCase().trim(),
      limit: 10,
    });

    if (customers.data.length === 0) {
      return NextResponse.json({ found: false });
    }

    for (const customer of customers.data) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        return NextResponse.json({
          found: true,
          customerId: customer.id,
          email: customer.email,
          premiumUntil: getSubscriptionPeriodEnd(subscriptions.data[0]),
        });
      }
    }

    return NextResponse.json({ found: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Restore error:", message);
    return NextResponse.json(
      {
        found: false,
        error: "Could not look up subscription. Please try again.",
        debug: message,
      },
      { status: 500 }
    );
  }
}
