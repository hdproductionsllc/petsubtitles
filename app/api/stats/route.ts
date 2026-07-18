import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseServer";

export const maxDuration = 15;

function dateKey(daysAgo: number): string {
  const d = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Traction stats for external monitoring (cloud routine / dashboards).
 * Auth: Bearer STATS_TOKEN — aggregates only, no user data.
 */
export async function GET(request: NextRequest) {
  const token = process.env.STATS_TOKEN;
  const auth = request.headers.get("authorization") ?? "";
  const queryToken = request.nextUrl.searchParams.get("token") ?? "";
  if (!token || (auth !== `Bearer ${token}` && queryToken !== token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Generation counts from Supabase (null if project unreachable/unconfigured)
  let generationsToday: number | null = null;
  let generationsYesterday: number | null = null;
  if (supabaseAdmin) {
    try {
      const { data } = await supabaseAdmin
        .from("daily_stats")
        .select("date, free_generations")
        .in("date", [dateKey(0), dateKey(1)]);
      for (const row of data ?? []) {
        if (row.date === dateKey(0)) generationsToday = row.free_generations;
        if (row.date === dateKey(1)) generationsYesterday = row.free_generations;
      }
    } catch {
      // leave nulls — Supabase down is a reportable state, not an error
    }
  }

  // Subscription counts from Stripe
  let activeSubscriptions: number | null = null;
  let newSubscriptionsLast7d: number | null = null;
  try {
    const weekAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
    const active = await stripe.subscriptions.list({ status: "active", limit: 100 });
    activeSubscriptions = active.data.length;
    newSubscriptionsLast7d = active.data.filter((s) => s.created >= weekAgo).length;
  } catch {
    // leave nulls
  }

  return NextResponse.json({
    date: dateKey(0),
    generationsToday,
    generationsYesterday,
    activeSubscriptions,
    newSubscriptionsLast7d,
    supabaseReachable: generationsToday !== null || generationsYesterday !== null,
  });
}
