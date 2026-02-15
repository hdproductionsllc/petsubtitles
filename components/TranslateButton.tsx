"use client";

import { useEffect, useState } from "react";

const LOADING_MESSAGES = [
  "Reading body language...",
  "Consulting the cat council...",
  "Decoding tail wags...",
  "Translating from Bark...",
  "Checking the treat calendar...",
  "Analyzing ear positions...",
  "Reviewing nap schedule...",
  "Sniffing for context clues...",
];

interface Props {
  onClick: () => void;
  isLoading: boolean;
  disabled: boolean;
  label?: string;
}

export default function TranslateButton({ onClick, isLoading, disabled, label }: Props) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setMessageIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [isLoading]);

  return (
    <div className="px-4 py-3">
      <button
        onClick={onClick}
        disabled={disabled || isLoading}
        className={`btn-press w-full rounded-2xl px-6 py-4 text-lg font-bold text-white shadow-lg transition-all ${
          disabled || isLoading
            ? "cursor-not-allowed bg-gray-300"
            : "bg-teal hover:bg-teal-dark active:shadow-md"
        }`}
        aria-label={isLoading ? "Translating pet thoughts..." : "Translate my pet's thoughts"}
      >
        {isLoading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-1.5">
              <span className="paw-dot" />
              <span className="paw-dot" />
              <span className="paw-dot" />
            </div>
            <span key={messageIndex} className="animate-fade-in text-sm font-normal opacity-90">
              {LOADING_MESSAGES[messageIndex]}
            </span>
          </div>
        ) : (
          label || "🐾 Translate My Pet's Thoughts"
        )}
      </button>
    </div>
  );
}
