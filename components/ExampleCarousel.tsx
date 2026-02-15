"use client";

import { useEffect, useState, useCallback } from "react";
import { CONVO_EXAMPLES } from "@/lib/sampleData";

interface Props {
  onTryIt: () => void;
}

const MSG_DELAY = 700;
const PAUSE_AFTER_DONE = 3000;

export default function ExampleCarousel({ onTryIt }: Props) {
  const [convoIndex, setConvoIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(0);
  const [fading, setFading] = useState(false);

  const convo = CONVO_EXAMPLES[convoIndex];
  const totalMessages = convo.messages.length;

  const advanceToNext = useCallback(() => {
    setFading(true);
    setTimeout(() => {
      setConvoIndex((prev) => (prev + 1) % CONVO_EXAMPLES.length);
      setVisibleCount(0);
      setFading(false);
    }, 300);
  }, []);

  // Animate messages in one by one, then pause and advance
  useEffect(() => {
    if (visibleCount < totalMessages) {
      const timer = setTimeout(
        () => setVisibleCount((c) => c + 1),
        visibleCount === 0 ? 400 : MSG_DELAY
      );
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(advanceToNext, PAUSE_AFTER_DONE);
      return () => clearTimeout(timer);
    }
  }, [visibleCount, totalMessages, advanceToNext]);

  return (
    <div className="px-4 py-2">
      {/* Headline */}
      <h2 className="font-[family-name:var(--font-display)] text-center text-2xl font-bold text-charcoal mb-1">
        What would your pet <span className="text-coral">text</span> you?
      </h2>
      <p className="text-center text-sm text-charcoal-light mb-3">
        Upload a photo. Get the conversation you always knew they were having.
      </p>

      {/* iMessage conversation card */}
      <div
        className={`overflow-hidden rounded-3xl shadow-xl transition-opacity duration-300 ${
          fading ? "opacity-0" : "opacity-100"
        }`}
      >
        {/* Dark header with pet photo + name */}
        <div
          className="flex flex-col items-center px-4 pt-5 pb-3"
          style={{
            background: "linear-gradient(to bottom, #1A1A2E, #16213E)",
          }}
        >
          {/* Circular pet photo */}
          <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-white/20 shadow-lg">
            <img
              src={convo.petPhoto}
              alt={convo.petName}
              className="h-full w-full object-cover"
            />
          </div>
          <p className="mt-1.5 text-base font-bold text-white">
            {convo.petName}
          </p>
          <p className="text-[11px] text-white/50">iMessage</p>
        </div>

        {/* Conversation bubbles */}
        <div className="bg-white px-3 py-3" style={{ minHeight: "260px" }}>
          {convo.messages.map((msg, i) => {
            if (i >= visibleCount) return null;
            const isOwner = msg.sender === "owner";
            const prevSame =
              i > 0 && convo.messages[i - 1].sender === msg.sender;
            return (
              <div
                key={`${convo.id}-${i}`}
                className={`flex msg-pop ${
                  isOwner ? "justify-end" : "justify-start"
                } ${prevSame ? "mt-0.5" : "mt-2"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-[14px] leading-snug ${
                    isOwner
                      ? "bg-[#007AFF] text-white"
                      : "bg-[#E9E9EB] text-black"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })}

          {/* Typing indicator — show before next pet message */}
          {visibleCount < totalMessages &&
            convo.messages[visibleCount].sender === "pet" &&
            visibleCount > 0 && (
              <div className="mt-2 flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl bg-[#E9E9EB] px-4 py-2.5">
                  <span className="typing-dot" />
                  <span className="typing-dot" style={{ animationDelay: "0.15s" }} />
                  <span className="typing-dot" style={{ animationDelay: "0.3s" }} />
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Dots indicator */}
      <div className="mt-3 flex justify-center gap-1.5">
        {CONVO_EXAMPLES.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setFading(true);
              setTimeout(() => {
                setConvoIndex(i);
                setVisibleCount(0);
                setFading(false);
              }, 300);
            }}
            className={`h-1.5 rounded-full transition-all ${
              i === convoIndex ? "w-6 bg-coral" : "w-1.5 bg-charcoal/20"
            }`}
            aria-label={`Show example ${i + 1}`}
          />
        ))}
      </div>

      {/* CTA button */}
      <button
        onClick={onTryIt}
        className="btn-press mt-4 w-full rounded-2xl bg-coral px-6 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-coral-dark min-h-[56px]"
      >
        Try It Free — See Your Pet&apos;s Texts
      </button>
    </div>
  );
}
