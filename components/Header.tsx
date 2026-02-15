"use client";

import { getAvailableCredits, isPremium } from "@/lib/usageTracker";
import { useEffect, useState } from "react";

interface Props {
  creditRefresh?: number;
}

export default function Header({ creditRefresh }: Props) {
  const [creditsLeft, setCreditsLeft] = useState<number | null>(null);
  const [premium, setPremium] = useState(false);

  useEffect(() => {
    setCreditsLeft(getAvailableCredits());
    setPremium(isPremium());
  }, [creditRefresh]);

  return (
    <header className="flex items-center justify-between px-3 py-2">
      <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-charcoal">
        🐾 What My Pet Thinks
      </h1>
      {creditsLeft !== null && (
        <div className="flex items-center gap-1.5">
          {premium && (
            <span className="rounded-full bg-amber px-2 py-0.5 text-xs font-bold text-white">
              PRO
            </span>
          )}
          <div
            className={`rounded-full px-3 py-1 text-sm font-semibold ${
              creditsLeft > 0
                ? "bg-amber/10 text-amber"
                : "bg-red-50 text-red-500"
            }`}
          >
            {creditsLeft > 0
              ? `🐾 ${creditsLeft} left today`
              : "0 left today"}
          </div>
        </div>
      )}
    </header>
  );
}
