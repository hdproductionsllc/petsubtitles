"use client";

import type { VoiceStyle } from "@/lib/anthropic";

const VOICES: { id: VoiceStyle; label: string; emoji: string }[] = [
  { id: "funny", label: "Silly", emoji: "😂" },
  { id: "passive", label: "Passive Agg", emoji: "😒" },
  { id: "genz", label: "Gen-Z", emoji: "💀" },
  { id: "dramatic", label: "Dramatic Narr", emoji: "🎬" },
];

interface Props {
  selected: VoiceStyle;
  onSelect: (voice: VoiceStyle) => void;
  format?: "caption" | "convo";
  onFormatChange?: (format: "caption" | "convo") => void;
  lockedVoices?: VoiceStyle[];
  onLockedSelect?: (voice: VoiceStyle) => void;
}

export default function VoiceSelector({ selected, onSelect, format, onFormatChange, lockedVoices, onLockedSelect }: Props) {
  return (
    <div className="px-3 py-1.5">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-sm font-semibold text-charcoal-light">Voice style</p>
        {format && onFormatChange && (
          <div className="flex rounded-full bg-gray-100 p-0.5">
            <button
              onClick={() => onFormatChange("caption")}
              className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                format === "caption"
                  ? "bg-coral text-white shadow-sm"
                  : "text-charcoal-light"
              }`}
            >
              Meme
            </button>
            <button
              onClick={() => onFormatChange("convo")}
              className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                format === "convo"
                  ? "bg-coral text-white shadow-sm"
                  : "text-charcoal-light"
              }`}
            >
              Text Convo
            </button>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {VOICES.map((voice) => {
          const isActive = selected === voice.id;
          const isLocked = lockedVoices?.includes(voice.id) ?? false;

          return (
            <button
              key={voice.id}
              onClick={() => (isLocked ? onLockedSelect?.(voice.id) : onSelect(voice.id))}
              className={`btn-press flex items-center gap-0.5 rounded-full px-2 py-1.5 text-xs font-semibold transition-all ${
                isActive
                  ? "bg-coral text-white shadow-md"
                  : isLocked
                    ? "bg-white text-charcoal/40 shadow-sm ring-1 ring-gray-200"
                    : "bg-white text-charcoal shadow-sm ring-1 ring-gray-200"
              }`}
              aria-pressed={isActive}
              aria-label={`${voice.label} voice${isLocked ? " (share to unlock)" : ""}`}
            >
              <span>{isLocked ? "🔒" : voice.emoji}</span>
              <span>{voice.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
