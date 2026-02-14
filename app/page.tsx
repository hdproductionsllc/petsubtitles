"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import Header from "@/components/Header";
import PhotoCapture, { type PhotoCaptureHandle } from "@/components/PhotoCapture";
import VoiceSelector from "@/components/VoiceSelector";
import TranslateButton from "@/components/TranslateButton";
import PaywallModal from "@/components/PaywallModal";
import ResultDisplay from "@/components/ResultDisplay";
import ShareButtons from "@/components/ShareButtons";
import ExampleCarousel from "@/components/ExampleCarousel";
import SocialProof from "@/components/SocialProof";
import PersonalizeSection, { loadSavedPersonalization } from "@/components/PersonalizeSection";
import RecentHistory, {
  saveToHistory,
  createThumbnail,
  type HistoryItem,
} from "@/components/RecentHistory";
import { processImageFile } from "@/lib/imageUtils";
import { compositeSubtitles, compositeBattle, type BattleEntry } from "@/lib/imageCompositor";
import {
  isPremiumVoice,
  hasFreeCredits,
  hasPremiumCredits,
  useFreeCredit,
  usePremiumCredit,
  earnShareCredit,
} from "@/lib/usageTracker";
import { trackEvent } from "@/lib/analytics";
import type { VoiceStyle } from "@/lib/anthropic";

type AppState = "idle" | "photo_selected" | "scanning" | "translating" | "battle_translating" | "result" | "battle_result" | "error";

const ALL_VOICES: VoiceStyle[] = ["funny", "dramatic", "genz", "shakespeare", "passive", "therapist", "telenovela"];

/** Pick n random voices from the list */
function pickRandomVoices(n: number, exclude?: VoiceStyle): VoiceStyle[] {
  const pool = exclude ? ALL_VOICES.filter(v => v !== exclude) : [...ALL_VOICES];
  const picked: VoiceStyle[] = [];
  while (picked.length < n && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

export default function Home() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [selectedVoice, setSelectedVoice] = useState<VoiceStyle>("funny");
  const [imageData, setImageData] = useState<{
    base64: string;
    dataUrl: string;
    mediaType: string;
    originalDataUrl: string;
  } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [caption, setCaption] = useState("");
  const [standardImage, setStandardImage] = useState("");
  const [storyImage, setStoryImage] = useState("");
  const [error, setError] = useState("");
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallReason, setPaywallReason] = useState<"no_credits" | "premium_voice">("no_credits");
  const [paywallVoice, setPaywallVoice] = useState<string | undefined>();
  const [isOffline, setIsOffline] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);
  const [creditRefresh, setCreditRefresh] = useState(0);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [battleImage, setBattleImage] = useState("");
  const [battleEntries, setBattleEntries] = useState<BattleEntry[]>([]);
  const [petName, setPetName] = useState("");
  const [petPronouns, setPetPronouns] = useState("");

  const photoCaptureRef = useRef<PhotoCaptureHandle>(null);


  // Track page load + load saved personalization
  useEffect(() => {
    trackEvent("page_load");
    const saved = loadSavedPersonalization();
    if (saved.name) setPetName(saved.name);
    if (saved.pronouns) setPetPronouns(saved.pronouns);
  }, []);

  // Track online/offline
  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    setIsOffline(!navigator.onLine);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  const refreshCredits = useCallback(() => {
    setCreditRefresh((k) => k + 1);
  }, []);

  const handleImageSelected = useCallback(async (file: File) => {
    try {
      trackEvent("photo_selected");
      setIsConverting(true);
      setError("");
      const result = await processImageFile(file);
      setImageData(result);
      setPreviewUrl(result.originalDataUrl);
      setAppState("photo_selected");
    } catch {
      setError("Could not process that image. Please try another photo.");
      setAppState("error");
    } finally {
      setIsConverting(false);
    }
  }, []);

  const handleClear = useCallback(() => {
    setImageData(null);
    setPreviewUrl(null);
    setCaption("");
    setStandardImage("");
    setStoryImage("");
    setBattleImage("");
    setBattleEntries([]);
    setError("");
    setAppState("idle");
  }, []);

  /** Clear state and immediately open file picker */
  const handleNewPhoto = useCallback(() => {
    trackEvent("new_photo_tapped");
    setImageData(null);
    setPreviewUrl(null);
    setCaption("");
    setStandardImage("");
    setStoryImage("");
    setBattleImage("");
    setBattleEntries([]);
    setError("");
    setAppState("idle");
    setTimeout(() => {
      photoCaptureRef.current?.openFilePicker();
    }, 100);
  }, []);

  /** Pre-check: scan for pets before making the expensive translate call */
  const scanForPets = useCallback(async (): Promise<boolean> => {
    if (!imageData) return false;
    setAppState("scanning");
    try {
      const res = await fetch("/api/detect-pet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: imageData.base64,
          mediaType: imageData.mediaType,
        }),
      });
      const data = await res.json();
      if (!data.hasPet) {
        trackEvent("pet_detection_failed");
        setError("We don't see a pet in this photo! Try uploading a picture with your furry (or scaly) friend front and center.");
        setAppState("error");
        return false;
      }
      return true;
    } catch {
      // Fail-open: if detection errors, let the translate go through
      return true;
    }
  }, [imageData]);

  const doTranslate = useCallback(async (voice?: VoiceStyle) => {
    if (!imageData) return;

    const voiceToUse = voice ?? selectedVoice;
    const premium = isPremiumVoice(voiceToUse);

    // Check credits based on voice type
    if (premium && !hasPremiumCredits()) {
      trackEvent("paywall_shown", { reason: "premium_voice" });
      setPaywallReason("premium_voice");
      setPaywallVoice(voiceToUse);
      setPaywallOpen(true);
      return;
    }
    if (!premium && !hasFreeCredits()) {
      trackEvent("paywall_shown", { reason: "no_credits" });
      setPaywallReason("no_credits");
      setPaywallVoice(undefined);
      setPaywallOpen(true);
      return;
    }

    // Pet detection pre-check
    const hasPet = await scanForPets();
    if (!hasPet) return;

    trackEvent("translate_tapped");
    setAppState("translating");
    setError("");

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: imageData.base64,
          mediaType: imageData.mediaType,
          voiceStyle: voiceToUse,
          petName: petName || undefined,
          pronouns: petPronouns || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Translation failed");
      }

      setCaption(data.caption);
      trackEvent("translation_received", { voice_style: voiceToUse });

      // Composite the subtitles using full-resolution original
      let composited;
      try {
        composited = await compositeSubtitles(imageData.originalDataUrl, data.caption);
      } catch {
        throw new Error("Couldn't create the subtitle image. Try a different photo.");
      }
      setStandardImage(composited.standardDataUrl);
      setStoryImage(composited.storyDataUrl);

      // Use the appropriate credit
      if (premium) {
        usePremiumCredit();
      } else {
        useFreeCredit();
      }
      refreshCredits();

      // Save to history
      const thumbnail = await createThumbnail(composited.standardDataUrl);
      saveToHistory({
        thumbnailDataUrl: thumbnail,
        standardImageUrl: composited.standardDataUrl,
        storyImageUrl: composited.storyDataUrl,
        caption: data.caption,
      });
      setHistoryKey((k) => k + 1);

      setAppState("result");

      // Signal successful translation for install prompt timing
      window.dispatchEvent(new CustomEvent("petsubtitles:first-result"));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again!"
      );
      setAppState("error");
    }
  }, [imageData, selectedVoice, petName, petPronouns, refreshCredits, scanForPets]);

  const doBattle = useCallback(async () => {
    if (!imageData) return;

    // Battle is a premium feature — costs 1 premium credit
    if (!hasPremiumCredits()) {
      trackEvent("paywall_shown", { reason: "premium_voice" });
      setPaywallReason("premium_voice");
      setPaywallVoice(undefined);
      setPaywallOpen(true);
      return;
    }

    // Pet detection pre-check
    const hasPet = await scanForPets();
    if (!hasPet) return;

    trackEvent("battle_tapped");
    setAppState("battle_translating");
    setError("");

    try {
      const voices = pickRandomVoices(3);

      // Fire 3 API calls in parallel
      const results = await Promise.all(
        voices.map(async (voice) => {
          const res = await fetch("/api/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageBase64: imageData.base64,
              mediaType: imageData.mediaType,
              voiceStyle: voice,
              petName: petName || undefined,
              pronouns: petPronouns || undefined,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Translation failed");
          return { voiceId: voice, caption: data.caption };
        })
      );

      setBattleEntries(results);

      // Composite battle image using full-resolution original
      const battleDataUrl = await compositeBattle(imageData.originalDataUrl, results);
      setBattleImage(battleDataUrl);

      // Use 1 premium credit
      usePremiumCredit();
      refreshCredits();

      setAppState("battle_result");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Battle failed. Please try again!"
      );
      setAppState("error");
    }
  }, [imageData, petName, petPronouns, refreshCredits, scanForPets]);

  const handleVoiceSelect = useCallback((voice: VoiceStyle) => {
    trackEvent("voice_style_selected", { voice_style: voice });
    setSelectedVoice(voice);
    // If we're in result state, auto re-translate with the new voice
    if (appState === "result" && imageData) {
      doTranslate(voice);
    }
  }, [appState, imageData, doTranslate]);

  const handlePremiumTap = useCallback((voice: VoiceStyle) => {
    trackEvent("premium_voice_tapped", { voice_style: voice });
    setPaywallReason("premium_voice");
    setPaywallVoice(voice);
    setPaywallOpen(true);
  }, []);

  const handleShareComplete = useCallback(() => {
    const earned = earnShareCredit();
    refreshCredits();
    if (earned) {
      setShareToast("Earned 1 premium credit! ✨");
      setTimeout(() => setShareToast(null), 3000);
    }
  }, [refreshCredits]);

  const handleShareToUnlock = useCallback(() => {
    const earned = earnShareCredit();
    refreshCredits();
    if (earned) {
      setShareToast("Premium credit earned! ✨");
      setTimeout(() => setShareToast(null), 3000);
    }
  }, [refreshCredits]);

  const handleRestore = useCallback((item: HistoryItem) => {
    setCaption(item.caption);
    setStandardImage(item.standardImageUrl);
    setStoryImage(item.storyImageUrl);
    setPreviewUrl(null);
    setImageData(null);
    setAppState("result");
  }, []);

  /** "Try It Free" from carousel — opens file picker */
  const handleTryIt = useCallback(() => {
    photoCaptureRef.current?.openFilePicker();
  }, []);

  /** "Different Caption" — re-translate same photo, same voice */
  const handleDifferentCaption = useCallback(() => {
    trackEvent("different_caption_tapped");
    doTranslate();
  }, [doTranslate]);

  const showingResult = appState === "result" || appState === "battle_result";
  const showingLoading = appState === "translating" || appState === "battle_translating" || appState === "scanning";

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <Header creditRefresh={creditRefresh} />

      {/* Offline banner */}
      {isOffline && (
        <div className="mx-4 mb-2 rounded-xl bg-red-50 px-4 py-2 text-center text-sm font-semibold text-red-600">
          You&apos;re offline. Connect to the internet to translate.
        </div>
      )}

      {/* Share credit toast */}
      {shareToast && (
        <div className="toast-enter mx-4 mb-2 flex justify-center">
          <div className="rounded-full bg-teal px-4 py-2 text-sm font-semibold text-white shadow-lg">
            {shareToast}
          </div>
        </div>
      )}

      {/* IDLE STATE: Example carousel + CTA */}
      {appState === "idle" && (
        <ExampleCarousel onTryIt={handleTryIt} />
      )}

      {/* Photo upload — show when photo selected, converting, or in error state */}
      {(appState === "photo_selected" || appState === "error" || isConverting) && (
        <PhotoCapture
          ref={photoCaptureRef}
          onImageSelected={handleImageSelected}
          previewUrl={previewUrl}
          onClear={handleClear}
          isConverting={isConverting}
        />
      )}

      {/* Hidden PhotoCapture just for the file input ref when in idle state */}
      {appState === "idle" && (
        <div className="hidden">
          <PhotoCapture
            ref={photoCaptureRef}
            onImageSelected={handleImageSelected}
            previewUrl={null}
            onClear={handleClear}
            isConverting={false}
          />
        </div>
      )}

      {/* Personalization section — show when photo selected */}
      {appState === "photo_selected" && (
        <PersonalizeSection
          petName={petName}
          petPronouns={petPronouns}
          onNameChange={setPetName}
          onPronounsChange={setPetPronouns}
        />
      )}

      {/* Voice selector — show when photo selected, translating, OR in result state (not battle) */}
      {(appState === "photo_selected" || appState === "translating" || appState === "result") && (
        <VoiceSelector
          selected={selectedVoice}
          onSelect={handleVoiceSelect}
          onPremiumTap={handlePremiumTap}
          creditRefresh={creditRefresh}
        />
      )}

      {/* Translate + Battle buttons — show when photo selected */}
      {appState === "photo_selected" && (
        <>
          <TranslateButton
            onClick={() => doTranslate()}
            isLoading={false}
            disabled={!imageData || isOffline}
          />
          <div className="px-4 pb-2">
            <button
              onClick={doBattle}
              disabled={!imageData || isOffline}
              className="btn-press w-full rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 py-3.5 text-base font-bold text-white shadow-lg transition hover:shadow-xl disabled:opacity-50 min-h-[48px]"
            >
              Caption Battle — 3 Voices, 1 Photo {!hasPremiumCredits() && "✨"}
            </button>
          </div>
        </>
      )}

      {/* Scanning state */}
      {appState === "scanning" && (
        <div className="mx-4 mt-4 flex flex-col items-center justify-center rounded-2xl bg-amber/5 p-8">
          <div className="flex gap-1.5">
            <span className="paw-dot" />
            <span className="paw-dot" />
            <span className="paw-dot" />
          </div>
          <p className="mt-3 text-sm font-semibold text-amber-dark">
            Scanning for pets...
          </p>
        </div>
      )}

      {/* Loading state — single translate */}
      {appState === "translating" && (
        <TranslateButton
          onClick={() => {}}
          isLoading={true}
          disabled={true}
        />
      )}

      {/* Loading state — battle */}
      {appState === "battle_translating" && (
        <div className="px-4 mt-4">
          <button
            disabled
            className="w-full rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 py-3.5 text-base font-bold text-white shadow-lg opacity-80 animate-pulse min-h-[48px]"
          >
            Battling voices...
          </button>
        </div>
      )}

      {/* Error state */}
      {appState === "error" && error && (
        <div className="mx-4 mt-4 rounded-2xl bg-red-50 px-4 py-3 text-center animate-fade-up">
          <p className="text-sm font-semibold text-red-600">{error}</p>
          <button
            onClick={handleClear}
            className="mt-2 text-sm font-semibold text-red-500 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Result */}
      {appState === "result" && standardImage && (
        <>
          <div className="mt-2">
            <ResultDisplay imageDataUrl={standardImage} caption={caption} />
          </div>

          {/* Personalization nudge if no name was set */}
          {!petName && (
            <div className="mx-4 mt-2 rounded-xl bg-amber/5 px-4 py-2 text-center">
              <p className="text-xs text-charcoal-light">
                Add your pet&apos;s name for personalized captions
              </p>
            </div>
          )}

          <ShareButtons
            standardImageUrl={standardImage}
            storyImageUrl={storyImage}
            caption={caption}
            voiceStyle={selectedVoice}
            onShareComplete={handleShareComplete}
            onDifferentCaption={imageData ? handleDifferentCaption : undefined}
            onNewPhoto={handleNewPhoto}
          />
        </>
      )}

      {/* Battle result */}
      {appState === "battle_result" && battleImage && (
        <>
          <div className="mt-2 px-4">
            <img
              src={battleImage}
              alt="Caption Battle results"
              className="w-full rounded-2xl shadow-lg animate-fade-up"
            />
          </div>
          <div className="px-4 py-3">
            <button
              onClick={async () => {
                trackEvent("share_tapped", { share_type: "battle" });
                const { shareImage } = await import("@/lib/shareUtils");
                const shared = await shareImage(
                  battleImage,
                  `Caption Battle! Which voice wins? 🐾 ${battleEntries.map(e => `"${e.caption}"`).join(" vs ")}`,
                  "battle"
                );
                if (shared) {
                  trackEvent("share_completed", { share_type: "battle" });
                  handleShareComplete();
                }
              }}
              className="btn-press w-full rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 py-3.5 text-base font-bold text-white shadow-lg min-h-[48px]"
            >
              Share This Battle
            </button>
          </div>
          <div className="flex gap-2 px-4 py-1">
            <button
              onClick={doBattle}
              className="btn-press flex-1 rounded-2xl bg-purple-100 py-3 text-sm font-bold text-purple-600 transition hover:bg-purple-200 min-h-[44px]"
            >
              New Battle
            </button>
            <button
              onClick={handleNewPhoto}
              className="btn-press flex-1 rounded-2xl bg-gray-100 py-3 text-sm font-semibold text-charcoal transition hover:bg-gray-200 min-h-[44px]"
            >
              New Photo
            </button>
          </div>
        </>
      )}

      {/* Spacer when no result */}
      {!showingResult && !showingLoading && <div className="mt-2" />}

      {/* Social proof (idle) or Recent history (has translations) */}
      <div className="mt-auto">
        {appState === "idle" ? (
          <SocialProof />
        ) : (
          <RecentHistory key={historyKey} onRestore={handleRestore} />
        )}
      </div>

      {/* Footer */}
      <footer className="px-4 pb-6 pt-2 text-center text-xs text-charcoal/30">
        Made with 🐾 by PetSubtitles
        <span className="mx-1">·</span>
        <a href="/privacy" className="underline hover:text-charcoal/50">Privacy</a>
      </footer>

      {/* Paywall modal */}
      <PaywallModal
        isOpen={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        reason={paywallReason}
        premiumVoiceName={paywallVoice}
        lastResultImage={standardImage || undefined}
        lastCaption={caption || undefined}
        onShareToUnlock={handleShareToUnlock}
      />
    </div>
  );
}
