"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { activatePremium } from "@/lib/usageTracker";
import { trackEvent } from "@/lib/analytics";

type Status = "verifying" | "success" | "error";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<Status>("verifying");

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      return;
    }

    async function verifySession() {
      try {
        const res = await fetch("/api/verify-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });

        if (!res.ok) throw new Error("Verification failed");

        const data = await res.json();

        if (data.active) {
          activatePremium(data.email, data.customerId, data.premiumUntil);
          trackEvent("premium_activated", { source: "checkout" });
          setStatus("success");
        } else {
          setStatus("error");
        }
      } catch {
        setStatus("error");
      }
    }

    verifySession();
  }, [sessionId]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center p-6">
      {status === "verifying" && (
        <div className="text-center animate-fade-in">
          <div className="flex gap-1.5 justify-center mb-4">
            <span className="paw-dot" />
            <span className="paw-dot" />
            <span className="paw-dot" />
          </div>
          <p className="text-lg font-semibold text-charcoal">
            Activating your premium...
          </p>
        </div>
      )}

      {status === "success" && (
        <div className="text-center animate-bounce-in">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-charcoal mb-2">
            Welcome to PRO!
          </h1>
          <p className="text-charcoal-light mb-6">
            You now get 20 translations per day. Go wild.
          </p>
          <a
            href="/"
            className="btn-press inline-block rounded-2xl bg-coral px-8 py-4 text-lg font-bold text-white shadow-lg hover:bg-coral-dark min-h-[52px]"
          >
            Start Translating
          </a>
        </div>
      )}

      {status === "error" && (
        <div className="text-center animate-fade-in">
          <div className="text-5xl mb-4">😿</div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-charcoal mb-2">
            Something went wrong
          </h1>
          <p className="text-charcoal-light mb-6">
            Your payment may have gone through. Try &quot;Restore Purchase&quot;
            on the main page, or contact us.
          </p>
          <a
            href="/"
            className="btn-press inline-block rounded-2xl bg-teal px-8 py-4 text-lg font-bold text-white shadow-lg hover:bg-teal-dark min-h-[52px]"
          >
            Back to App
          </a>
        </div>
      )}
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center p-6">
          <div className="flex gap-1.5 justify-center mb-4">
            <span className="paw-dot" />
            <span className="paw-dot" />
            <span className="paw-dot" />
          </div>
          <p className="text-lg font-semibold text-charcoal">Loading...</p>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
