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
import PersonalizeSection, { loadSavedPersonalization, savePersonalization } from "@/components/PersonalizeSection";
import RecentHistory, {
  saveToHistory,
  createThumbnail,
  type HistoryItem,
} from "@/components/RecentHistory";
import { processImageFile } from "@/lib/imageUtils";
import { compositeSubtitles, compositeConvo } from "@/lib/imageCompositor";
import type { ConvoMessage } from "@/lib/anthropic";
import {
  hasCredits,
  useCredit,
  isPremium,
  isPremiumExpired,
  reverifyPremium,
} from "@/lib/usageTracker";
import { trackEvent } from "@/lib/analytics";
import { playMessageSound } from "@/lib/sounds";
import type { VoiceStyle } from "@/lib/anthropic";

type AppState = "idle" | "photo_selected" | "scanning" | "translating" | "result" | "error";

const ALL_VOICES: VoiceStyle[] = ["funny", "dramatic", "genz", "passive"];

const VOICE_DISPLAY_NAMES: Record<VoiceStyle, string> = {
  funny: "Silly",
  passive: "Passive Agg",
  genz: "Gen-Z",
  dramatic: "Dramatic Narrator",
};

const VOICE_SUGGESTIONS: Record<VoiceStyle, VoiceStyle> = {
  funny: "passive",
  passive: "genz",
  genz: "dramatic",
  dramatic: "passive",
};


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
  const [isOffline, setIsOffline] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);
  const [creditRefresh, setCreditRefresh] = useState(0);
  const [selectedFormat, setSelectedFormat] = useState<"caption" | "convo">("convo");
  const [convoMessages, setConvoMessages] = useState<ConvoMessage[]>([]);
  const [memeCaption, setMemeCaption] = useState<{ top: string; bottom: string } | null>(null);
  const [petName, setPetName] = useState("");
  const [petPronouns, setPetPronouns] = useState("");
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [usedVoices, setUsedVoices] = useState<VoiceStyle[]>([]);

  const photoCaptureRef = useRef<PhotoCaptureHandle>(null);


  // Track page load + load saved personalization + check first-time flag + reverify premium
  useEffect(() => {
    trackEvent("page_load");
    const saved = loadSavedPersonalization();
    if (saved.name) setPetName(saved.name);
    if (saved.pronouns) setPetPronouns(saved.pronouns);
    if (localStorage.getItem("wmpt_has_translated")) {
      setIsFirstTime(false);
    }
    // Re-verify premium subscription if cached period has expired
    if (isPremium() && isPremiumExpired()) {
      reverifyPremium().then(() => refreshCredits());
    }
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
    setConvoMessages([]);
    setMemeCaption(null);
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
    setConvoMessages([]);
    setMemeCaption(null);
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

  const doTranslate = useCallback(async (voice?: VoiceStyle, nameOverride?: string, formatOverride?: "caption" | "convo") => {
    if (!imageData) return;

    const voiceToUse = voice ?? selectedVoice;
    const format = formatOverride ?? selectedFormat;
    const nameToUse = nameOverride ?? petName;

    // Check credits
    if (!hasCredits()) {
      trackEvent("paywall_shown", { reason: "no_credits" });
      setPaywallOpen(true);
      return;
    }

    // Pet detection pre-check
    const hasPet = await scanForPets();
    if (!hasPet) return;

    trackEvent("translate_tapped", { format });
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
          petName: nameToUse || undefined,
          pronouns: petPronouns || undefined,
          format,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Translation failed");
      }

      let composited;
      let displayCaption: string;

      if (format === "convo") {
        setConvoMessages(data.messages);
        displayCaption = "Text Convo";
        setCaption("Text conversation");
        trackEvent("convo_received", { voice_style: voiceToUse });

        try {
          composited = await compositeConvo(imageData.originalDataUrl, data.messages, nameToUse || undefined);
        } catch {
          throw new Error("Couldn't create the conversation image. Try a different photo.");
        }
      } else {
        const mc = data.caption as { top: string; bottom: string };
        setMemeCaption(mc);
        displayCaption = `${mc.top} — ${mc.bottom}`;
        setCaption(displayCaption);
        setConvoMessages([]);
        trackEvent("translation_received", { voice_style: voiceToUse });

        try {
          composited = await compositeSubtitles(imageData.originalDataUrl, mc);
        } catch {
          throw new Error("Couldn't create the meme image. Try a different photo.");
        }
      }

      setStandardImage(composited.standardDataUrl);
      setStoryImage(composited.storyDataUrl);

      // Use one credit
      useCredit();
      refreshCredits();

      // Save to history
      const thumbnail = await createThumbnail(composited.standardDataUrl);
      saveToHistory({
        thumbnailDataUrl: thumbnail,
        standardImageUrl: composited.standardDataUrl,
        storyImageUrl: composited.storyDataUrl,
        caption: displayCaption,
      });
      setHistoryKey((k) => k + 1);

      setAppState("result");
      playMessageSound();

      // Track used voice for smart suggestions
      setUsedVoices((prev) => prev.includes(voiceToUse) ? prev : [...prev, voiceToUse]);

      // Mark first translation complete + save name if provided
      if (!localStorage.getItem("wmpt_has_translated")) {
        localStorage.setItem("wmpt_has_translated", "true");
        if (nameToUse) savePersonalization(nameToUse, petPronouns);
        trackEvent("first_translation");
      }

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
  }, [imageData, selectedVoice, selectedFormat, petName, petPronouns, refreshCredits, scanForPets]);

  const handleVoiceSelect = useCallback((voice: VoiceStyle) => {
    trackEvent("voice_style_selected", { voice_style: voice });
    setSelectedVoice(voice);
    // If we're in result state, auto re-translate with the new voice
    if (appState === "result" && imageData) {
      doTranslate(voice);
    }
  }, [appState, imageData, doTranslate]);

  const handleFormatChange = useCallback((fmt: "caption" | "convo") => {
    setSelectedFormat(fmt);
    // If we're in result state, auto re-translate with the new format
    if (appState === "result" && imageData) {
      doTranslate(undefined, undefined, fmt);
    }
  }, [appState, imageData, doTranslate]);

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

  /** "Different Caption/Convo" — re-translate same photo, same voice */
  const handleDifferentCaption = useCallback(() => {
    trackEvent("different_caption_tapped", { format: selectedFormat });
    doTranslate();
  }, [doTranslate, selectedFormat]);

  // Smart voice suggestion: pick next untried voice, or use the suggestion map
  const suggestedVoice: VoiceStyle = (() => {
    const suggestion = VOICE_SUGGESTIONS[selectedVoice];
    if (!usedVoices.includes(suggestion)) return suggestion;
    const untried = ALL_VOICES.find((v) => !usedVoices.includes(v));
    return untried ?? "funny";
  })();
  const suggestedVoiceName = VOICE_DISPLAY_NAMES[suggestedVoice];

  const handleTryVoice = useCallback(() => {
    trackEvent("try_voice_tapped", { voice_style: suggestedVoice });
    setSelectedVoice(suggestedVoice);
    doTranslate(suggestedVoice);
  }, [suggestedVoice, doTranslate]);

  const showingResult = appState === "result";
  const showingLoading = appState === "translating" || appState === "scanning";

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <Header creditRefresh={creditRefresh} />

      {/* Offline banner */}
      {isOffline && (
        <div className="mx-3 mb-1.5 rounded-xl bg-red-50 px-3 py-1.5 text-center text-sm font-semibold text-red-600">
          You&apos;re offline. Connect to the internet to translate.
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

      {/* Personalization section — show when photo selected (returning users only) */}
      {appState === "photo_selected" && !isFirstTime && (
        <PersonalizeSection
          petName={petName}
          petPronouns={petPronouns}
          onNameChange={setPetName}
          onPronounsChange={setPetPronouns}
        />
      )}

      {/* Voice & format selector — show when photo selected, translating, OR in result state (returning users only) */}
      {(appState === "photo_selected" || appState === "translating" || appState === "result") && !isFirstTime && (
        <VoiceSelector
          selected={selectedVoice}
          onSelect={handleVoiceSelect}
          format={selectedFormat}
          onFormatChange={handleFormatChange}
        />
      )}

      {/* Name input for first-timers — show above translate button */}
      {appState === "photo_selected" && isFirstTime && (
        <div className="px-4 pt-2 pb-1">
          <label className="mb-1.5 block text-center text-sm font-semibold text-charcoal">
            What&apos;s your pet&apos;s name?
          </label>
          <input
            type="text"
            value={petName}
            onChange={(e) => setPetName(e.target.value.slice(0, 20))}
            placeholder="e.g. Biscuit, Luna, Mr. Whiskers"
            className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-center text-base outline-none transition focus:border-coral focus:ring-2 focus:ring-coral/20"
          />
        </div>
      )}

      {/* Translate button — show when photo selected */}
      {appState === "photo_selected" && (
        <TranslateButton
          onClick={() => doTranslate()}
          isLoading={false}
          disabled={!imageData || isOffline}
          label={isFirstTime ? "What's your pet thinking? 🐾" : undefined}
        />
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
          <div className="mt-1">
            <ResultDisplay imageDataUrl={standardImage} caption={caption} hideCaption={selectedFormat === "convo"} />
          </div>

          {/* Name hint for returning users who haven't set a name */}
          {!petName && !isFirstTime && (
            <div className="mx-3 mt-1.5 rounded-xl bg-amber/5 px-3 py-1.5 text-center">
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
            isConvo={selectedFormat === "convo"}
            onDifferentCaption={imageData ? handleDifferentCaption : undefined}
            onTryVoice={imageData ? handleTryVoice : undefined}
            suggestedVoiceName={suggestedVoiceName}
            onNewPhoto={handleNewPhoto}
          />
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
      <footer className="px-3 pb-4 pt-1.5 text-center text-xs text-charcoal/30">
        Made with 🐾 by What My Pet Thinks
        <span className="mx-1">·</span>
        <a href="/privacy" className="underline hover:text-charcoal/50">Privacy</a>
      </footer>

      {/* Paywall modal */}
      <PaywallModal
        isOpen={paywallOpen}
        onClose={() => setPaywallOpen(false)}
      />
    </div>
  );
}
