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
import { compositeSubtitles, compositeConvo, compositeBattle, type BattleEntry } from "@/lib/imageCompositor";
import type { ConvoMessage } from "@/lib/anthropic";
import {
  hasCredits,
  getAvailableCredits,
  useCredit,
  earnShareCredit,
} from "@/lib/usageTracker";
import { trackEvent } from "@/lib/analytics";
import type { VoiceStyle } from "@/lib/anthropic";

type AppState = "idle" | "photo_selected" | "scanning" | "translating" | "battle_translating" | "result" | "battle_result" | "error";

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
  const [isOffline, setIsOffline] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);
  const [creditRefresh, setCreditRefresh] = useState(0);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [battleImage, setBattleImage] = useState("");
  const [battleEntries, setBattleEntries] = useState<BattleEntry[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<"caption" | "convo">("convo");
  const [convoMessages, setConvoMessages] = useState<ConvoMessage[]>([]);
  const [petName, setPetName] = useState("");
  const [petPronouns, setPetPronouns] = useState("");
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [showNameInput, setShowNameInput] = useState(false);
  const [nameInputValue, setNameInputValue] = useState("");
  const [usedVoices, setUsedVoices] = useState<VoiceStyle[]>([]);

  const photoCaptureRef = useRef<PhotoCaptureHandle>(null);


  // Track page load + load saved personalization + check first-time flag
  useEffect(() => {
    trackEvent("page_load");
    const saved = loadSavedPersonalization();
    if (saved.name) setPetName(saved.name);
    if (saved.pronouns) setPetPronouns(saved.pronouns);
    if (localStorage.getItem("wmpt_has_translated")) {
      setIsFirstTime(false);
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
    setBattleImage("");
    setBattleEntries([]);
    setConvoMessages([]);
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
    setConvoMessages([]);
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

  const doTranslate = useCallback(async (voice?: VoiceStyle, nameOverride?: string) => {
    if (!imageData) return;

    const voiceToUse = voice ?? selectedVoice;
    const format = selectedFormat;
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

      if (format === "convo") {
        setConvoMessages(data.messages);
        setCaption("Text conversation");
        trackEvent("convo_received", { voice_style: voiceToUse });

        try {
          composited = await compositeConvo(imageData.originalDataUrl, data.messages, nameToUse || undefined);
        } catch {
          throw new Error("Couldn't create the conversation image. Try a different photo.");
        }
      } else {
        setCaption(data.caption);
        setConvoMessages([]);
        trackEvent("translation_received", { voice_style: voiceToUse });

        try {
          composited = await compositeSubtitles(imageData.originalDataUrl, data.caption);
        } catch {
          throw new Error("Couldn't create the subtitle image. Try a different photo.");
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
        caption: format === "convo" ? "Text Convo" : data.caption,
      });
      setHistoryKey((k) => k + 1);

      setAppState("result");

      // Track used voice for smart suggestions
      setUsedVoices((prev) => prev.includes(voiceToUse) ? prev : [...prev, voiceToUse]);

      // Mark first translation complete
      if (!localStorage.getItem("wmpt_has_translated")) {
        localStorage.setItem("wmpt_has_translated", "true");
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

  const doBattle = useCallback(async () => {
    if (!imageData) return;

    // Battle costs 3 credits (one per voice)
    if (getAvailableCredits() < 3) {
      trackEvent("paywall_shown", { reason: "no_credits" });
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

      // Use 3 credits (one per voice)
      useCredit();
      useCredit();
      useCredit();
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

  const handleShareComplete = useCallback(() => {
    const earned = earnShareCredit();
    refreshCredits();
    if (earned) {
      setShareToast("Earned 1 extra translation! 🐾");
      setTimeout(() => setShareToast(null), 3000);
    }
  }, [refreshCredits]);

  const handleShareToUnlock = useCallback(() => {
    const earned = earnShareCredit();
    refreshCredits();
    if (earned) {
      setShareToast("Earned 1 extra translation! 🐾");
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

  /** "Different Caption/Convo" — re-translate same photo, same voice */
  const handleDifferentCaption = useCallback(() => {
    trackEvent("different_caption_tapped", { format: selectedFormat });
    doTranslate();
  }, [doTranslate, selectedFormat]);

  /** First-time user adds pet name on result screen — save and re-translate */
  const handleFirstTimeNameSubmit = useCallback(() => {
    const name = nameInputValue.trim().slice(0, 20);
    if (!name) return;
    setPetName(name);
    savePersonalization(name, petPronouns);
    setShowNameInput(false);
    doTranslate(undefined, name);
  }, [nameInputValue, petPronouns, doTranslate]);

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

  const showingResult = appState === "result" || appState === "battle_result";
  const showingLoading = appState === "translating" || appState === "battle_translating" || appState === "scanning";

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <Header creditRefresh={creditRefresh} />

      {/* Offline banner */}
      {isOffline && (
        <div className="mx-3 mb-1.5 rounded-xl bg-red-50 px-3 py-1.5 text-center text-sm font-semibold text-red-600">
          You&apos;re offline. Connect to the internet to translate.
        </div>
      )}

      {/* Share credit toast */}
      {shareToast && (
        <div className="toast-enter mx-3 mb-1.5 flex justify-center">
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

      {/* Personalization section — show when photo selected (returning users only) */}
      {appState === "photo_selected" && !isFirstTime && (
        <PersonalizeSection
          petName={petName}
          petPronouns={petPronouns}
          onNameChange={setPetName}
          onPronounsChange={setPetPronouns}
        />
      )}

      {/* Format selector — show when photo selected or in result state (returning users only) */}
      {(appState === "photo_selected" || appState === "result") && !isFirstTime && (
        <div className="flex justify-center gap-1 px-4 py-2">
          <button
            onClick={() => setSelectedFormat("caption")}
            className={`rounded-full px-5 py-2 text-sm font-bold transition ${
              selectedFormat === "caption"
                ? "bg-coral text-white"
                : "bg-gray-100 text-charcoal"
            }`}
          >
            Caption
          </button>
          <button
            onClick={() => setSelectedFormat("convo")}
            className={`rounded-full px-5 py-2 text-sm font-bold transition ${
              selectedFormat === "convo"
                ? "bg-coral text-white"
                : "bg-gray-100 text-charcoal"
            }`}
          >
            Text Convo
          </button>
        </div>
      )}

      {/* Voice selector — show when photo selected, translating, OR in result state (returning users only) */}
      {(appState === "photo_selected" || appState === "translating" || appState === "result") && !isFirstTime && (
        <VoiceSelector
          selected={selectedVoice}
          onSelect={handleVoiceSelect}
        />
      )}

      {/* Translate + Battle buttons — show when photo selected */}
      {appState === "photo_selected" && (
        <>
          <TranslateButton
            onClick={() => doTranslate()}
            isLoading={false}
            disabled={!imageData || isOffline}
            label={isFirstTime ? "What's your pet thinking? 🐾" : undefined}
          />
          {!isFirstTime && (
            <div className="px-4 pb-2">
              <button
                onClick={doBattle}
                disabled={!imageData || isOffline}
                className="btn-press w-full rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 py-3.5 text-base font-bold text-white shadow-lg transition hover:shadow-xl disabled:opacity-50 min-h-[48px]"
              >
                Caption Battle — 3 Voices, 1 Photo
              </button>
            </div>
          )}
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
          <div className="mt-1">
            <ResultDisplay imageDataUrl={standardImage} caption={caption} />
          </div>

          {/* Inline name prompt — interactive for first-timers, static for returning users */}
          {!petName && isFirstTime && (
            <div className="mx-3 mt-1.5 rounded-xl bg-amber/5 px-3 py-2 text-center animate-fade-up">
              {showNameInput ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={nameInputValue}
                    onChange={(e) => setNameInputValue(e.target.value.slice(0, 20))}
                    onKeyDown={(e) => e.key === "Enter" && handleFirstTimeNameSubmit()}
                    placeholder="e.g. Biscuit"
                    autoFocus
                    className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber focus:ring-2 focus:ring-amber/20"
                  />
                  <button
                    onClick={handleFirstTimeNameSubmit}
                    disabled={!nameInputValue.trim()}
                    className="rounded-xl bg-coral px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                  >
                    Go
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowNameInput(true)}
                  className="text-sm font-semibold text-coral hover:underline"
                >
                  Add your pet&apos;s name for a personalized conversation &rarr;
                </button>
              )}
            </div>
          )}
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
            onShareComplete={handleShareComplete}
            onDifferentCaption={imageData ? handleDifferentCaption : undefined}
            onTryVoice={imageData ? handleTryVoice : undefined}
            suggestedVoiceName={suggestedVoiceName}
            onNewPhoto={handleNewPhoto}
          />
        </>
      )}

      {/* Battle result */}
      {appState === "battle_result" && battleImage && (
        <>
          <div className="mt-1 px-2">
            <img
              src={battleImage}
              alt="Caption Battle results"
              className="w-full rounded-2xl shadow-lg animate-fade-up"
            />
          </div>
          <ShareButtons
            standardImageUrl={battleImage}
            storyImageUrl={battleImage}
            caption={`Caption Battle! Which voice wins? 🐾\n${battleEntries.map(e => `"${e.caption}"`).join("\n")}`}
            voiceStyle="battle"
            onShareComplete={handleShareComplete}
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
        lastResultImage={standardImage || undefined}
        lastCaption={caption || undefined}
        onShareToUnlock={handleShareToUnlock}
      />
    </div>
  );
}
