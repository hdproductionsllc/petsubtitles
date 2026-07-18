"use client";

import { useState } from "react";

interface Props {
  onSend: (text: string) => Promise<void>;
  disabled: boolean;
  isThinking: boolean;
  repliesLeft: number;
  isPro: boolean;
  onLimitReached: () => void;
  petName?: string;
}

const MAX_LEN = 280;

export default function ReplyComposer({
  onSend,
  disabled,
  isThinking,
  repliesLeft,
  isPro,
  onLimitReached,
  petName,
}: Props) {
  const [text, setText] = useState("");
  const name = petName || "your pet";

  // Out of replies — swap the input for a nudge
  if (repliesLeft <= 0) {
    if (isPro) {
      return (
        <div className="mx-3 mt-1.5 px-3 py-1.5 text-center">
          <p className="text-xs text-charcoal-light">
            {petName || "Your pet"} needs a nap. Start a new photo!
          </p>
        </div>
      );
    }
    return (
      <div className="mx-3 mt-1.5 rounded-xl bg-amber/10 px-4 py-3 text-center animate-fade-up">
        <p className="text-sm font-semibold text-charcoal">
          {petName || "Your pet"} has more to say...
        </p>
        <button
          onClick={onLimitReached}
          className="btn-press mt-2 rounded-xl bg-coral px-4 py-2 text-sm font-bold text-white shadow transition hover:bg-coral-dark min-h-[44px]"
        >
          Go PRO to keep chatting
        </button>
      </div>
    );
  }

  const canSend = text.trim().length > 0 && !disabled && !isThinking;

  const submit = async () => {
    if (!canSend) return;
    const value = text.trim();
    setText("");
    await onSend(value);
  };

  return (
    <div className="px-3 pt-1">
      {/* Typing indicator */}
      {isThinking && (
        <div className="mb-1.5 flex items-center gap-2 pl-1 animate-fade-up">
          <div className="flex items-center gap-1 rounded-full bg-[#E9E9EB] px-3 py-2">
            <span className="typing-dot" style={{ animationDelay: "0s" }} />
            <span className="typing-dot" style={{ animationDelay: "0.2s" }} />
            <span className="typing-dot" style={{ animationDelay: "0.4s" }} />
          </div>
          <span className="text-xs text-charcoal-light">{name} is typing...</span>
        </div>
      )}

      {/* iMessage-style input bar */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={`Reply to ${name}...`}
          disabled={disabled}
          className="flex-1 rounded-full border-2 border-gray-200 bg-white px-4 py-2.5 text-base outline-none transition focus:border-coral focus:ring-2 focus:ring-coral/20 disabled:opacity-60 min-h-[44px]"
        />
        <button
          onClick={submit}
          disabled={!canSend}
          aria-label="Send reply"
          className="btn-press flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-coral text-white shadow transition hover:bg-coral-dark disabled:opacity-40 min-h-[44px]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
