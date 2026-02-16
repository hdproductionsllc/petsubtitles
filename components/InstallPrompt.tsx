"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already installed as PWA
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Check if previously dismissed
    const lastDismissed = localStorage.getItem("petsubtitles_install_dismissed");
    if (lastDismissed) {
      const hoursSince = (Date.now() - parseInt(lastDismissed, 10)) / (1000 * 60 * 60);
      if (hoursSince < 24) return;
    }

    // Detect iOS Safari (no beforeinstallprompt support)
    const ua = navigator.userAgent;
    const isiOS = /iphone|ipad|ipod/i.test(ua) && !("beforeinstallprompt" in window);
    setIsIOS(isiOS);

    // Show banner after 2+ successful translations (with 2s delay),
    // or fall back to 60s if the user never translates
    let showTimer: ReturnType<typeof setTimeout> | null = null;
    let translationCount = 0;

    const onResult = () => {
      translationCount++;
      if (translationCount >= 2) {
        if (showTimer) clearTimeout(showTimer);
        showTimer = setTimeout(() => setShowBanner(true), 2000);
      }
    };

    window.addEventListener("petsubtitles:first-result", onResult);

    // Fallback: show after 60s regardless
    const fallbackTimer = setTimeout(() => {
      setShowBanner(true);
    }, 60000);

    // Android/Chrome — also capture the install prompt
    if (!isiOS) {
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
      };
      window.addEventListener("beforeinstallprompt", handler);

      return () => {
        window.removeEventListener("beforeinstallprompt", handler);
        window.removeEventListener("petsubtitles:first-result", onResult);
        clearTimeout(fallbackTimer);
        if (showTimer) clearTimeout(showTimer);
      };
    }

    return () => {
      window.removeEventListener("petsubtitles:first-result", onResult);
      clearTimeout(fallbackTimer);
      if (showTimer) clearTimeout(showTimer);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem("petsubtitles_install_dismissed", String(Date.now()));
  };

  if (!showBanner || dismissed) return null;

  // iOS "Add to Home Screen" guide
  if (isIOS) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40 animate-slide-up">
        <div className="mx-auto max-w-lg rounded-t-3xl bg-white px-4 pb-6 pt-4 shadow-2xl">
          <div className="mb-1 flex items-center justify-between">
            <p className="font-[family-name:var(--font-display)] text-base font-bold text-charcoal">
              Install What My Pet Thinks
            </p>
            <button
              onClick={handleDismiss}
              className="rounded-full p-2 text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Dismiss"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {!showIOSGuide ? (
            <>
              <p className="text-sm text-charcoal-light">
                Open instantly from your home screen — no app store needed
              </p>
              <button
                onClick={() => setShowIOSGuide(true)}
                className="btn-press mt-3 w-full rounded-2xl bg-coral py-3 font-bold text-white shadow-md min-h-[48px]"
              >
                Show Me How
              </button>
            </>
          ) : (
            <div className="mt-2 space-y-3">
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-coral text-sm font-bold text-white">
                  1
                </span>
                <p className="text-sm text-charcoal-light pt-0.5">
                  Tap the{" "}
                  <span className="inline-block px-0.5">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2" className="inline align-text-bottom">
                      <path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                  </span>{" "}
                  Share button in Safari
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-coral text-sm font-bold text-white">
                  2
                </span>
                <p className="text-sm text-charcoal-light pt-0.5">
                  Scroll down, tap <strong>&quot;Add to Home Screen&quot;</strong>
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-coral text-sm font-bold text-white">
                  3
                </span>
                <p className="text-sm text-charcoal-light pt-0.5">
                  Tap <strong>&quot;Add&quot;</strong> — done!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Android/Chrome install prompt
  if (!deferredPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 animate-slide-up">
      <div className="mx-auto max-w-lg rounded-t-3xl bg-white px-4 pb-6 pt-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/icons/icon-192.png" alt="" className="h-10 w-10 rounded-xl" />
            <div>
              <p className="font-[family-name:var(--font-display)] text-base font-bold text-charcoal">
                Install What My Pet Thinks
              </p>
              <p className="text-xs text-charcoal-light">
                Launches instantly from your home screen
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="rounded-full p-2 text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Dismiss"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <button
          onClick={handleInstall}
          className="btn-press mt-3 w-full rounded-2xl bg-coral py-3 font-bold text-white shadow-md min-h-[48px]"
        >
          Add to Home Screen
        </button>
      </div>
    </div>
  );
}
