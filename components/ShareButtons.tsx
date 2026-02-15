"use client";

import { useState } from "react";
import {
  canUseWebShare,
  shareImage,
  downloadImage,
  generateFilename,
  copyLinkToClipboard,
  openInstagram,
  openTikTok,
  shareToX,
  shareToFacebook,
} from "@/lib/shareUtils";
import { trackEvent } from "@/lib/analytics";

interface Props {
  standardImageUrl: string;
  storyImageUrl: string;
  caption: string;
  voiceStyle?: string;
  isConvo?: boolean;
  onDifferentCaption?: () => void;
  onTryVoice?: () => void;
  suggestedVoiceName?: string;
  suggestedVoiceEmoji?: string;
  onNewPhoto?: () => void;
}

export default function ShareButtons({
  standardImageUrl,
  storyImageUrl,
  caption,
  voiceStyle,
  isConvo,
  onDifferentCaption,
  onTryVoice,
  suggestedVoiceName,
  suggestedVoiceEmoji,
  onNewPhoto,
}: Props) {
  const [toast, setToast] = useState<string | null>(null);
  const webShareAvailable = canUseWebShare();

  const shareText = isConvo
    ? "find out what your pet would text you 😂 whatmypetthinks.com #WhatMyPetThinks"
    : "find out what your pet is really thinking 😂 whatmypetthinks.com #WhatMyPetThinks";

  const copyShareText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      return true;
    } catch {
      return false;
    }
  };

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleShare = async () => {
    trackEvent("share_tapped", { platform: "share_feed" });
    await shareImage(standardImageUrl, caption, voiceStyle, false, isConvo);
  };

  const handleShareStory = async () => {
    trackEvent("share_tapped", { platform: "share_story" });
    await shareImage(storyImageUrl, caption, voiceStyle, true, isConvo);
  };

  const handleSave = async () => {
    trackEvent("share_tapped", { platform: "save" });
    if (webShareAvailable) {
      // On mobile, use share sheet — includes "Save Image" option for camera roll
      try {
        const res = await fetch(standardImageUrl);
        const blob = await res.blob();
        const file = new File([blob], generateFilename(voiceStyle, false, isConvo), { type: "image/png" });
        await navigator.share({ files: [file] });
        showToast("Saved! 🐾");
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          // Fallback to download if share fails
          downloadImage(standardImageUrl, generateFilename(voiceStyle, false, isConvo));
          showToast("Saved! 🐾");
        }
      }
    } else {
      downloadImage(standardImageUrl, generateFilename(voiceStyle, false, isConvo));
      const copied = await copyShareText();
      showToast(copied ? "Saved! Caption copied 📋" : "Saved! 🐾");
    }
  };

  const handleInstagram = async () => {
    trackEvent("share_tapped", { platform: "instagram" });
    downloadImage(storyImageUrl, generateFilename(voiceStyle, true, isConvo));
    await copyShareText();
    showToast("Image saved! Caption copied 📋");
    setTimeout(() => openInstagram(), 800);
  };

  const handleTikTok = async () => {
    trackEvent("share_tapped", { platform: "tiktok" });
    downloadImage(standardImageUrl, generateFilename(voiceStyle, false, isConvo));
    await copyShareText();
    showToast("Image saved! Caption copied 📋");
    setTimeout(() => openTikTok(), 800);

  };

  const handleX = async () => {
    trackEvent("share_tapped", { platform: "x" });
    downloadImage(standardImageUrl, generateFilename(voiceStyle, false, isConvo));
    await copyShareText();
    showToast("Image saved! Caption copied 📋");
    setTimeout(() => shareToX(caption, isConvo), 800);

  };

  const handleFacebook = async () => {
    trackEvent("share_tapped", { platform: "facebook" });
    downloadImage(standardImageUrl, generateFilename(voiceStyle, false, isConvo));
    await copyShareText();
    showToast("Image saved! Caption copied 📋");
    setTimeout(() => shareToFacebook(), 800);

  };

  const handleCopy = async () => {
    trackEvent("share_tapped", { platform: "copy_link" });
    await navigator.clipboard.writeText(shareText).catch(() => {});
    showToast("Caption copied to clipboard! 📋");

  };

  return (
    <div className="px-3 py-2 animate-fade-up" style={{ animationDelay: "0.15s" }}>
      {/* Mobile: share button via Web Share API */}
      {webShareAvailable && (
        <div className="mb-1.5">
          <button
            onClick={handleShare}
            className="btn-press w-full rounded-2xl bg-coral px-4 py-3 text-base font-bold text-white shadow-lg transition hover:bg-coral-dark min-h-[48px]"
          >
            Share
          </button>
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        className="btn-press mb-2 w-full rounded-2xl border-2 border-coral bg-white px-4 py-3 text-base font-bold text-coral transition hover:bg-coral/5 min-h-[48px]"
      >
        💾 Save Image
      </button>

      {/* Desktop fallback: platform buttons (save image + open platform) */}
      {!webShareAvailable && (
        <div className="mb-2 flex items-center justify-center gap-3">
          {/* Instagram */}
          <button
            onClick={handleInstagram}
            className="btn-press flex h-12 w-12 items-center justify-center rounded-full shadow-sm transition hover:scale-110"
            style={{ background: "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)" }}
            aria-label="Share to Instagram"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
          </button>

          {/* TikTok — official brand icon with cyan/red/white layers */}
          <button
            onClick={handleTikTok}
            className="btn-press flex h-12 w-12 items-center justify-center rounded-full shadow-sm transition hover:scale-110"
            style={{ backgroundColor: "#000000" }}
            aria-label="Share to TikTok"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.53 2h3.27a4.37 4.37 0 002.75 3.55 4.37 4.37 0 001.45.35v3.31a7.64 7.64 0 01-4.2-1.26v5.73A6.47 6.47 0 019.33 20a6.47 6.47 0 01-4.28-1.63A6.47 6.47 0 013 13.68a6.47 6.47 0 016.47-6.47c.35 0 .69.03 1.03.08v3.35a3.17 3.17 0 00-1.03-.17 3.17 3.17 0 00-3.17 3.17 3.17 3.17 0 003.17 3.17A3.17 3.17 0 0012.64 14l.03-12h-.14z" fill="#25F4EE" />
              <path d="M13.53 2h3.27a4.37 4.37 0 002.75 3.55 4.37 4.37 0 001.45.35v3.31a7.64 7.64 0 01-4.2-1.26v5.73A6.47 6.47 0 0110.33 20a6.47 6.47 0 01-4.28-1.63A6.47 6.47 0 014 13.68a6.47 6.47 0 016.47-6.47c.35 0 .69.03 1.03.08v3.35a3.17 3.17 0 00-1.03-.17 3.17 3.17 0 00-3.17 3.17 3.17 3.17 0 003.17 3.17A3.17 3.17 0 0013.64 14l.03-12h-.14z" fill="#FE2C55" />
              <path d="M13.03 2h3.27a4.37 4.37 0 002.75 3.55 4.37 4.37 0 001.45.35v3.31a7.64 7.64 0 01-4.2-1.26v5.73A6.47 6.47 0 019.83 20a6.47 6.47 0 01-4.28-1.63A6.47 6.47 0 013.5 13.68a6.47 6.47 0 016.47-6.47c.35 0 .69.03 1.03.08v3.35a3.17 3.17 0 00-1.03-.17 3.17 3.17 0 00-3.17 3.17 3.17 3.17 0 003.17 3.17A3.17 3.17 0 0013.14 14l.03-12h-.14z" fill="white" />
            </svg>
          </button>

          {/* X / Twitter */}
          <button
            onClick={handleX}
            className="btn-press flex h-12 w-12 items-center justify-center rounded-full shadow-sm transition hover:scale-110"
            style={{ backgroundColor: "#000000" }}
            aria-label="Share to X"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </button>

          {/* Facebook */}
          <button
            onClick={handleFacebook}
            className="btn-press flex h-12 w-12 items-center justify-center rounded-full shadow-sm transition hover:scale-110"
            style={{ backgroundColor: "#1877F2" }}
            aria-label="Share to Facebook"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </button>

          {/* Copy Link */}
          <button
            onClick={handleCopy}
            className="btn-press flex h-12 w-12 items-center justify-center rounded-full shadow-sm transition hover:scale-110"
            style={{ backgroundColor: "#6B7280" }}
            aria-label="Copy link"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
            </svg>
          </button>
        </div>
      )}

      {/* Regeneration buttons */}
      {(onDifferentCaption || onTryVoice) && (
        <div className="flex gap-2 mb-2">
          {onDifferentCaption && (
            <button
              onClick={onDifferentCaption}
              className="btn-press rounded-xl border-2 border-gray-200 bg-white px-3 py-3 text-sm font-semibold text-charcoal transition hover:bg-gray-50 min-h-[44px]"
              style={{ flex: "0 0 35%" }}
            >
              🔄 Try Again
            </button>
          )}
          {onTryVoice && suggestedVoiceName && (
            <button
              onClick={onTryVoice}
              className="btn-press flex-1 rounded-xl bg-coral px-3 py-3 text-sm font-bold text-white shadow transition hover:bg-coral-dark min-h-[44px]"
            >
              {suggestedVoiceEmoji || "🎭"} Try {suggestedVoiceName}
            </button>
          )}
        </div>
      )}

      {/* New photo button */}
      {onNewPhoto && (
        <button
          onClick={onNewPhoto}
          className="btn-press w-full rounded-xl bg-gray-100 px-3 py-3 text-sm font-semibold text-charcoal transition hover:bg-gray-200 min-h-[44px]"
        >
          📷 New Photo
        </button>
      )}

      {/* Toast */}
      {toast && (
        <div className="toast-enter mt-3 flex justify-center">
          <div className="rounded-full bg-teal px-4 py-2 text-sm font-semibold text-white shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
