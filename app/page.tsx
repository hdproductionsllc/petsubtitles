"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import Header from "@/components/Header";
import PhotoCapture, { type PhotoCaptureHandle } from "@/components/PhotoCapture";
import VoiceSelector from "@/components/VoiceSelector";
import TranslateButton from "@/components/TranslateButton";
import PaywallModal from "@/components/PaywallModal";
import ResultDisplay from "@/components/ResultDisplay";
import ShareButtons from "@/components/ShareButtons";
import ReplyComposer from "@/components/ReplyComposer";
import ExampleCarousel from "@/components/ExampleCarousel";
import LiveFeed from "@/components/LiveFeed";
import { uploadTranslation } from "@/lib/feedUploader";
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
  getPremiumCustomerId,
  isDramaticUnlocked,
  grantShareUnlock,
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
  dramatic: "Dramatic Narr",
};

const VOICE_EMOJIS: Record<VoiceStyle, string> = {
  funny: "😂",
  passive: "😒",
  genz: "💀",
  dramatic: "🎬",
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
  const [petGender, setPetGender] = useState("");
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [usedVoices, setUsedVoices] = useState<VoiceStyle[]>([]);
  const [dramaticLocked, setDramaticLocked] = useState(false);
  const [unlockHint, setUnlockHint] = useState(false);
  const [replyCount, setReplyCount] = useState(0);
  const [isReplying, setIsReplying] = useState(false);
  const [replyError, setReplyError] = useState("");

  const photoCaptureRef = useRef<PhotoCaptureHandle>(null);


  // Track page load + load saved personalization + check first-time flag + reverify premium
  useEffect(() => {
    trackEvent("page_load");
    const saved = loadSavedPersonalization();
    if (saved.name) setPetName(saved.name);
    if (saved.gender) setPetGender(saved.gender);
    if (localStorage.getItem("wmpt_has_translated")) {
      setIsFirstTime(false);
    }
    // Re-verify premium subscription if cached period has expired
    if (isPremium() && isPremiumExpired()) {
      reverifyPremium().then(() => refreshCredits());
    }
    setDramaticLocked(!isDramaticUnlocked());
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

  // Analytics: the share-to-unlock prompt was shown on a result card
  useEffect(() => {
    if (appState === "result" && dramaticLocked) {
      trackEvent("share_unlock_offered", { source: "result_card" });
    }
  }, [appState, dramaticLocked]);

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
      setReplyCount(0);
      setReplyError("");
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
    setReplyCount(0);
    setReplyError("");
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
    setReplyCount(0);
    setReplyError("");
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
      if (!res.ok) return true; // fail-open if detection service errors
      let data: { hasPet?: boolean };
      try { data = JSON.parse(await res.text()); } catch { return true; }
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
    setReplyCount(0);
    setReplyError("");

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: imageData.base64,
          mediaType: imageData.mediaType,
          voiceStyle: voiceToUse,
          petName: nameToUse || undefined,
          gender: petGender || undefined,
          format,
          customerId: getPremiumCustomerId() || undefined,
        }),
      });

      const text = await res.text();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          res.ok
            ? "Something went wrong. Please try again!"
            : "Our pet translator is napping. Try again in a moment!"
        );
      }

      if (!res.ok) {
        throw new Error(data?.error || "Translation failed");
      }

      let composited;
      let displayCaption: string;

      if (format === "convo") {
        setConvoMessages(data.messages);
        displayCaption = "Text Convo";
        const convoText = (data.messages as ConvoMessage[])
          .filter((m: ConvoMessage) => m.text !== "[PHOTO]")
          .map((m: ConvoMessage) => `${m.sender === "pet" ? (nameToUse || "Pet") : "Owner"}: ${m.text}`)
          .join("\n");
        setCaption(convoText);
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
          composited = await compositeSubtitles(imageData.originalDataUrl, mc, data.petFaceY);
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

      // Fire-and-forget upload to Supabase for the live feed
      uploadTranslation(composited.standardDataUrl, format, voiceToUse, nameToUse || undefined);

      setAppState("result");
      playMessageSound();

      // Track used voice for smart suggestions
      setUsedVoices((prev) => prev.includes(voiceToUse) ? prev : [...prev, voiceToUse]);

      // Mark first translation complete + save name if provided
      if (!localStorage.getItem("wmpt_has_translated")) {
        localStorage.setItem("wmpt_has_translated", "true");
        if (nameToUse) savePersonalization(nameToUse, petGender);
        trackEvent("first_translation");
      }
      setIsFirstTime(false);

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
  }, [imageData, selectedVoice, selectedFormat, petName, petGender, refreshCredits, scanForPets]);

  const handleVoiceSelect = useCallback((voice: VoiceStyle) => {
    trackEvent("voice_style_selected", { voice_style: voice });
    setSelectedVoice(voice);
    // If we're in result state, auto re-translate with the new voice
    if (appState === "result" && imageData) {
      doTranslate(voice);
    }
  }, [appState, imageData, doTranslate]);

  /** Tapping a locked voice: nudge toward sharing (the unlock), never a paywall */
  const handleLockedVoice = useCallback((voice: VoiceStyle) => {
    trackEvent("share_unlock_offered", { source: "voice_tap", voice_style: voice });
    setUnlockHint(true);
    setTimeout(() => setUnlockHint(false), 4000);
  }, []);

  /** Confirmed share: unlock Dramatic Narrator for today (+3 bonus gens, once/day) */
  const handleShareSuccess = useCallback((): string | null => {
    const wasOutOfCredits = !hasCredits();
    if (!grantShareUnlock()) return null;
    trackEvent("share_unlock_granted");
    setDramaticLocked(false);
    refreshCredits();
    return wasOutOfCredits
      ? "🎬 Dramatic Narr unlocked + 3 bonus translations!"
      : "🎬 Dramatic Narrator unlocked for today!";
  }, [refreshCredits]);

  const handleFormatChange = useCallback((fmt: "caption" | "convo") => {
    setSelectedFormat(fmt);
    // When switching format in result state, go back to photo_selected so the user
    // can pick a voice before translating again (don't auto-fire a new translation)
    if (appState === "result" && imageData) {
      setAppState("photo_selected");
    }
  }, [appState, imageData]);

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

  // Smart voice suggestion: pick next untried voice, or use the suggestion map.
  // Never suggest a voice that's share-locked.
  const suggestedVoice: VoiceStyle = (() => {
    const isLockedVoice = (v: VoiceStyle) => v === "dramatic" && dramaticLocked;
    const suggestion = VOICE_SUGGESTIONS[selectedVoice];
    if (!usedVoices.includes(suggestion) && !isLockedVoice(suggestion)) return suggestion;
    const untried = ALL_VOICES.find((v) => !usedVoices.includes(v) && !isLockedVoice(v));
    return untried ?? "funny";
  })();
  const suggestedVoiceName = VOICE_DISPLAY_NAMES[suggestedVoice];
  const suggestedVoiceEmoji = VOICE_EMOJIS[suggestedVoice];

  const handleTryVoice = useCallback(() => {
    trackEvent("try_voice_tapped", { voice_style: suggestedVoice });
    setSelectedVoice(suggestedVoice);
    doTranslate(suggestedVoice);
  }, [suggestedVoice, doTranslate]);

  /** Reply limits: free 3, PRO 20 per conversation. Resets on new generation/photo. */
  const replyCap = isPremium() ? 20 : 3;
  const repliesLeft = replyCap - replyCount;

  /** Out of replies: nudge free users toward PRO, never PRO users. */
  const handleReplyLimit = useCallback(() => {
    trackEvent("reply_limit_reached", { is_premium: isPremium() });
    if (!isPremium()) setPaywallOpen(true);
  }, []);

  /** Send an owner reply; pet answers back and the share image grows with the thread. */
  const handleReplySend = useCallback(async (text: string) => {
    if (!imageData) return;

    const priorMessages = convoMessages;
    const optimistic: ConvoMessage[] = [...priorMessages, { sender: "owner", text }];
    const replyNumber = replyCount + 1;

    // Optimistically show the owner's message; keep the result on screen throughout
    setConvoMessages(optimistic);
    setReplyError("");
    setIsReplying(true);
    trackEvent("reply_sent", { reply_number: replyNumber });

    try {
      const res = await fetch("/api/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: imageData.base64,
          mediaType: imageData.mediaType,
          voiceStyle: selectedVoice,
          petName: petName || undefined,
          gender: petGender || undefined,
          messages: priorMessages,
          reply: text,
          customerId: getPremiumCustomerId() || undefined,
        }),
      });

      const body = await res.text();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data: any;
      try {
        data = JSON.parse(body);
      } catch {
        throw new Error(
          res.ok
            ? "Something went wrong. Try again!"
            : "Your pet got distracted. Try again in a moment!"
        );
      }
      if (!res.ok) {
        throw new Error(data?.error || "Your pet got distracted. Try again in a moment!");
      }

      const petMessages = data.messages as ConvoMessage[];
      const full = [...optimistic, ...petMessages];
      setConvoMessages(full);
      setReplyCount(replyNumber);
      playMessageSound();
      trackEvent("reply_received", { message_count: petMessages.length });

      // Re-composite the whole thread so the share image includes the new replies
      const composited = await compositeConvo(imageData.originalDataUrl, full, petName || undefined);
      setStandardImage(composited.standardDataUrl);
      setStoryImage(composited.storyDataUrl);

      // Keep the share caption in sync with the fuller thread
      const convoText = full
        .filter((m) => m.text !== "[PHOTO]")
        .map((m) => `${m.sender === "pet" ? (petName || "Pet") : "Owner"}: ${m.text}`)
        .join("\n");
      setCaption(convoText);

      const thumbnail = await createThumbnail(composited.standardDataUrl);
      saveToHistory({
        thumbnailDataUrl: thumbnail,
        standardImageUrl: composited.standardDataUrl,
        storyImageUrl: composited.storyDataUrl,
        caption: "Text Convo",
      });
      setHistoryKey((k) => k + 1);
    } catch (err) {
      // Roll back the optimistic owner message; leave the result visible
      setConvoMessages(priorMessages);
      setReplyError(
        err instanceof Error ? err.message : "Your pet got distracted. Try again!"
      );
    } finally {
      setIsReplying(false);
    }
  }, [imageData, convoMessages, replyCount, selectedVoice, petName, petGender]);

  const showingResult = appState === "result";
  const showingLoading = appState === "translating" || appState === "scanning";

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <Header creditRefresh={creditRefresh} onOpenPaywall={() => setPaywallOpen(true)} />

      {/* Offline banner */}
      {isOffline && (
        <div className="mx-3 mb-1.5 rounded-xl bg-red-50 px-3 py-1.5 text-center text-sm font-semibold text-red-600">
          You&apos;re offline. Connect to the internet to translate.
        </div>
      )}

      {/* IDLE STATE: Example carousel + CTA */}
      {appState === "idle" && (
        <ExampleCarousel onTryIt={handleTryIt} onRestore={() => setPaywallOpen(true)} isPro={isPremium()} />
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
          petGender={petGender}
          onNameChange={setPetName}
          onGenderChange={setPetGender}
        />
      )}

      {/* Voice & format selector — show when photo selected, translating, OR in result state (returning users only) */}
      {(appState === "photo_selected" || appState === "translating" || appState === "result") && !isFirstTime && (
        <>
          <VoiceSelector
            selected={selectedVoice}
            onSelect={handleVoiceSelect}
            format={selectedFormat}
            onFormatChange={handleFormatChange}
            lockedVoices={dramaticLocked ? ["dramatic"] : undefined}
            onLockedSelect={handleLockedVoice}
          />
          {unlockHint && (
            <div className="mx-3 mt-1 rounded-xl bg-amber/10 px-3 py-1.5 text-center animate-fade-up">
              <p className="text-xs font-semibold text-charcoal">
                🔒 Share any result to unlock 🎬 Dramatic Narr for today
              </p>
            </div>
          )}
        </>
      )}

      {/* Name input for first-timers — show above translate button */}
      {appState === "photo_selected" && isFirstTime && (
        <div className="mx-4 mt-3 mb-1 rounded-2xl bg-amber/10 px-5 py-5 animate-fade-up">
          <label className="mb-2 block text-center text-lg font-bold text-charcoal">
            What&apos;s your pet&apos;s name? 🐾
          </label>
          <input
            type="text"
            value={petName}
            onChange={(e) => setPetName(e.target.value.slice(0, 20))}
            placeholder="e.g. Biscuit, Luna, Mr. Whiskers"
            autoFocus
            className="w-full rounded-xl border-2 border-coral/30 bg-white px-4 py-3.5 text-center text-lg font-medium outline-none transition focus:border-coral focus:ring-2 focus:ring-coral/20"
          />
          <p className="mt-2 text-center text-xs text-charcoal/50">
            Makes the translation way more personal
          </p>
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

          {/* Reply to your pet — the screenshot grows with the thread */}
          {selectedFormat === "convo" && convoMessages.length > 0 && imageData && (
            <>
              <ReplyComposer
                onSend={handleReplySend}
                disabled={isReplying || isOffline}
                isThinking={isReplying}
                repliesLeft={repliesLeft}
                isPro={isPremium()}
                onLimitReached={handleReplyLimit}
                petName={petName || undefined}
              />
              {replyError && (
                <div className="mx-3 mt-1.5 rounded-xl bg-red-50 px-3 py-1.5 text-center animate-fade-up">
                  <p className="text-xs font-semibold text-red-600">{replyError}</p>
                </div>
              )}
            </>
          )}

          {/* Name hint for returning users who haven't set a name */}
          {!petName && !isFirstTime && (
            <div className="mx-3 mt-1.5 rounded-xl bg-amber/5 px-3 py-1.5 text-center">
              <p className="text-xs text-charcoal-light">
                Add your pet&apos;s name for personalized captions
              </p>
            </div>
          )}

          {/* Share-to-unlock prompt: discovery framing, never credits/paywall */}
          {dramaticLocked && (
            <div className="mx-3 mt-1.5 rounded-xl bg-amber/5 px-3 py-1.5 text-center">
              <p className="text-xs text-charcoal-light">
                🔒 Share this to unlock the 🎬 Dramatic Narrator voice for today
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
            suggestedVoiceEmoji={suggestedVoiceEmoji}
            onNewPhoto={handleNewPhoto}
            onShareSuccess={handleShareSuccess}
          />
        </>
      )}

      {/* Spacer when no result */}
      {!showingResult && !showingLoading && <div className="mt-2" />}

      {/* Live feed (idle) or Recent history (has translations) */}
      <div className="mt-auto">
        {appState === "idle" ? (
          <LiveFeed />
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
