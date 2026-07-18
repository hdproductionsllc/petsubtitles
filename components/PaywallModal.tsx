"use client";

import { useEffect, useRef, useState } from "react";
import {
  isPremium,
  getPremiumCustomerId,
  getAvailableCredits,
  activatePremium,
} from "@/lib/usageTracker";
import { trackEvent } from "@/lib/analytics";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function PaywallModal({
  isOpen,
  onClose,
}: Props) {
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [showRestore, setShowRestore] = useState(false);
  const [restoreEmail, setRestoreEmail] = useState("");
  const [restoreStatus, setRestoreStatus] = useState<
    "idle" | "loading" | "found" | "not_found" | "error"
  >("idle");
  const overlayRef = useRef<HTMLDivElement>(null);

  const userIsPremium = isPremium();
  const customerId = getPremiumCustomerId();
  const creditsLeft = getAvailableCredits();
  const proHasCredits = userIsPremium && creditsLeft > 0;

  // Reset restore state when modal opens
  useEffect(() => {
    if (isOpen) {
      setShowRestore(false);
      setRestoreEmail("");
      setRestoreStatus("idle");
      setIsSubscribing(false);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubscribe = async () => {
    setIsSubscribing(true);
    trackEvent("paywall_subscribe_tapped");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const text = await res.text();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data: any;
      try { data = JSON.parse(text); } catch { throw new Error("Checkout failed"); }
      if (!res.ok) throw new Error("Checkout failed");
      if (data.url) {
        window.location.href = data.url;
      } else {
        setIsSubscribing(false);
      }
    } catch {
      setIsSubscribing(false);
    }
  };

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreEmail.trim()) return;
    setRestoreStatus("loading");
    trackEvent("paywall_restore_tapped");
    try {
      const res = await fetch("/api/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: restoreEmail.trim() }),
      });
      const text = await res.text();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data: any;
      try { data = JSON.parse(text); } catch { throw new Error("Restore failed"); }
      if (!res.ok) throw new Error("Restore failed");
      if (data.found) {
        activatePremium(data.email, data.customerId, data.premiumUntil);
        trackEvent("premium_restored");
        setRestoreStatus("found");
        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 1500);
      } else {
        setRestoreStatus("not_found");
      }
    } catch {
      setRestoreStatus("error");
    }
  };

  const handleManageSubscription = async () => {
    if (!customerId) return;
    try {
      const res = await fetch("/api/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      });
      if (!res.ok) return;
      const text = await res.text();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data: any;
      try { data = JSON.parse(text); } catch { return; }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // Portal failed — not critical
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={proHasCredits ? "PRO account" : "Daily limit reached"}
    >
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl animate-bounce-in">
        {/* Close button */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Header */}
        <div className="text-center">
          <div className="mb-3 text-4xl">{userIsPremium ? "✨" : "🐾"}</div>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-charcoal">
            {proHasCredits
              ? "PRO Account"
              : userIsPremium
                ? "PRO Limit Reached"
                : "Daily Limit Reached"}
          </h2>
          <p className="mt-1 text-sm text-charcoal-light">
            {proHasCredits
              ? `You have ${creditsLeft} translation${creditsLeft === 1 ? "" : "s"} left today`
              : userIsPremium
                ? "Even PRO members have a daily limit. Come back tomorrow for 15 more!"
                : "You've used your 3 free translations today"}
          </p>
        </div>

        {/* Subscribe / Manage section */}
        {userIsPremium ? (
          <div className="mt-4 text-center">
            <button
              onClick={handleManageSubscription}
              className="text-sm text-teal underline hover:text-teal-dark"
            >
              Manage Subscription
            </button>
          </div>
        ) : (
          <div className="mt-5">
            <p className="mb-3 text-center text-sm text-charcoal-light">
              Unlock 15/day with PRO
            </p>

            {/* Subscribe button */}
            <button
              onClick={handleSubscribe}
              disabled={isSubscribing}
              className="btn-press w-full rounded-2xl bg-amber px-6 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-amber-dark min-h-[52px] disabled:opacity-50"
            >
              {isSubscribing ? "Opening checkout..." : "Go PRO — $4.99/mo"}
            </button>

            <p className="mt-2 text-center text-xs text-charcoal/40">
              15 translations/day · Cancel anytime
            </p>

            {/* Restore purchase */}
            <div className="mt-4 text-center">
              {!showRestore ? (
                <button
                  onClick={() => setShowRestore(true)}
                  className="text-sm text-teal underline hover:text-teal-dark"
                >
                  Already subscribed? Restore purchase
                </button>
              ) : (
                <form onSubmit={handleRestore} className="mt-2">
                  <input
                    type="email"
                    value={restoreEmail}
                    onChange={(e) => setRestoreEmail(e.target.value)}
                    placeholder="Email used to subscribe"
                    required
                    autoFocus
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-center text-sm outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/20"
                  />
                  <button
                    type="submit"
                    disabled={restoreStatus === "loading"}
                    className="btn-press mt-2 w-full rounded-xl bg-teal py-3 font-bold text-white shadow-md transition hover:bg-teal-dark min-h-[44px] disabled:opacity-50"
                  >
                    {restoreStatus === "loading" ? "Looking up..." : "Restore"}
                  </button>
                  {restoreStatus === "found" && (
                    <p className="mt-2 text-sm font-semibold text-green-600">
                      PRO restored! Reloading...
                    </p>
                  )}
                  {restoreStatus === "not_found" && (
                    <p className="mt-2 text-sm text-red-500">
                      No active subscription found for that email.
                    </p>
                  )}
                  {restoreStatus === "error" && (
                    <p className="mt-2 text-sm text-red-500">
                      Something went wrong. Please try again.
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full py-2 text-sm text-gray-400 hover:text-gray-600 min-h-[44px]"
        >
          Maybe Later
        </button>
      </div>
    </div>
  );
}
