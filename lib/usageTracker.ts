"use client";

const FREE_USES_PER_DAY = 5;
const PREMIUM_USES_PER_DAY = 20;

// Premium storage keys
const PREMIUM_KEY = "wmpt_premium";
const PREMIUM_EMAIL_KEY = "wmpt_premium_email";
const PREMIUM_CUSTOMER_KEY = "wmpt_stripe_customer_id";
const PREMIUM_UNTIL_KEY = "wmpt_premium_until";

// Legacy keys (kept for backward compat)
const WAITLIST_KEY = "petsubtitles_waitlist_email";

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function storageKey(prefix: string): string {
  return `petsubtitles_${prefix}_${todayKey()}`;
}

function getNum(key: string): number {
  if (typeof window === "undefined") return 0;
  const val = localStorage.getItem(key);
  return val ? parseInt(val, 10) : 0;
}

function setNum(key: string, val: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, String(val));
}

// --- Premium ---

/** Check if user has active premium */
export function isPremium(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PREMIUM_KEY) === "true";
}

/** Check if premium cache has expired (needs re-verification) */
export function isPremiumExpired(): boolean {
  if (typeof window === "undefined") return true;
  const until = localStorage.getItem(PREMIUM_UNTIL_KEY);
  if (!until) return true;
  return new Date(until).getTime() < Date.now();
}

/** Get stored Stripe customer ID */
export function getPremiumCustomerId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PREMIUM_CUSTOMER_KEY);
}

/** Get stored premium email */
export function getPremiumEmail(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PREMIUM_EMAIL_KEY);
}

/** Activate premium from checkout/restore/re-verification */
export function activatePremium(
  email: string,
  customerId: string,
  premiumUntil: string
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREMIUM_KEY, "true");
  localStorage.setItem(PREMIUM_EMAIL_KEY, email);
  localStorage.setItem(PREMIUM_CUSTOMER_KEY, customerId);
  localStorage.setItem(PREMIUM_UNTIL_KEY, premiumUntil);
  // Reset today's usage so new PRO members get a full 20 credits on signup day
  localStorage.removeItem(storageKey("free_used"));
}

/** Deactivate premium (subscription cancelled/expired) */
export function deactivatePremium(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PREMIUM_KEY);
  localStorage.removeItem(PREMIUM_CUSTOMER_KEY);
  localStorage.removeItem(PREMIUM_UNTIL_KEY);
  // Keep email for potential re-subscribe / restore
}

/** Re-verify premium status with Stripe. Called when premium_until expires. */
export async function reverifyPremium(): Promise<boolean> {
  const customerId = getPremiumCustomerId();
  if (!customerId) {
    deactivatePremium();
    return false;
  }

  try {
    const res = await fetch("/api/subscription-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId }),
    });

    if (!res.ok) {
      deactivatePremium();
      return false;
    }

    const data = await res.json();
    if (data.active) {
      activatePremium(
        getPremiumEmail() || "",
        customerId,
        data.premiumUntil
      );
      return true;
    } else {
      deactivatePremium();
      return false;
    }
  } catch {
    // Network error — don't revoke premium, let cached status stand
    return isPremium();
  }
}

// --- Credits ---

/** How many credits are available right now */
export function getAvailableCredits(): number {
  const dailyLimit = isPremium() ? PREMIUM_USES_PER_DAY : FREE_USES_PER_DAY;
  const used = getNum(storageKey("free_used"));
  return Math.max(0, dailyLimit - used);
}

/** Whether the user can translate */
export function hasCredits(): boolean {
  return getAvailableCredits() > 0;
}

/** Consume one credit */
export function useCredit(): void {
  const key = storageKey("free_used");
  setNum(key, getNum(key) + 1);
}

// --- Waitlist (legacy) ---

export function saveWaitlistEmail(email: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(WAITLIST_KEY, email);
}

export function getWaitlistEmail(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(WAITLIST_KEY);
}
