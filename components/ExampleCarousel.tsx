"use client";

import { useEffect, useState, useCallback } from "react";
import { CAROUSEL_EXAMPLES, type CarouselExample } from "@/lib/sampleData";

interface Props {
  onTryIt: () => void;
  onRestore?: () => void;
}

const MSG_DELAY = 700;
const PAUSE_AFTER_DONE = 3000;
const CAPTION_HOLD = 4000;

export default function ExampleCarousel({ onTryIt, onRestore }: Props) {
  const [exIndex, setExIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(0);
  const [captionVisible, setCaptionVisible] = useState(false);
  const [fading, setFading] = useState(false);

  const example = CAROUSEL_EXAMPLES[exIndex];

  // Preload all carousel images on mount
  useEffect(() => {
    CAROUSEL_EXAMPLES.forEach((ex) => {
      const img = new Image();
      img.src = ex.petPhoto;
    });
  }, []);

  const advanceToNext = useCallback(() => {
    setFading(true);
    setTimeout(() => {
      setExIndex((prev) => (prev + 1) % CAROUSEL_EXAMPLES.length);
      setVisibleCount(0);
      setCaptionVisible(false);
      setFading(false);
    }, 300);
  }, []);

  // Animate messages one by one, then pause and advance
  useEffect(() => {
    if (example.type === "convo") {
      const totalMessages = example.messages.length;
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
    } else {
      if (!captionVisible) {
        const timer = setTimeout(() => setCaptionVisible(true), 500);
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(advanceToNext, CAPTION_HOLD);
        return () => clearTimeout(timer);
      }
    }
  }, [example, visibleCount, captionVisible, advanceToNext]);

  return (
    <div className="px-4 py-2">
      {/* Headline */}
      <h2 className="font-[family-name:var(--font-display)] text-center text-2xl font-bold text-charcoal mb-1">
        What is your pet <span className="text-coral">really</span> thinking?
      </h2>
      <p className="text-center text-sm text-charcoal-light mb-3">
        Upload a photo and find out.
      </p>

      {/* Card */}
      <div
        className={`overflow-hidden rounded-3xl shadow-xl transition-opacity duration-300 ${
          fading ? "opacity-0" : "opacity-100"
        }`}
      >
        {example.type === "convo" ? (
          <ConvoCard example={example} visibleCount={visibleCount} />
        ) : (
          <CaptionCard example={example} visible={captionVisible} />
        )}
      </div>

      {/* Dots indicator */}
      <div className="mt-3 flex justify-center gap-1.5">
        {CAROUSEL_EXAMPLES.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setFading(true);
              setTimeout(() => {
                setExIndex(i);
                setVisibleCount(0);
                setCaptionVisible(false);
                setFading(false);
              }, 300);
            }}
            className={`h-1.5 rounded-full transition-all ${
              i === exIndex ? "w-6 bg-coral" : "w-1.5 bg-charcoal/20"
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
        Try It Free
      </button>

      {/* Restore link */}
      {onRestore && (
        <button
          onClick={onRestore}
          className="mt-2 w-full py-2 text-sm text-teal underline hover:text-teal-dark"
        >
          Already PRO? Restore purchase
        </button>
      )}
    </div>
  );
}

/** iMessage conversation card — photo as first image bubble */
function ConvoCard({
  example,
  visibleCount,
}: {
  example: Extract<CarouselExample, { type: "convo" }>;
  visibleCount: number;
}) {
  return (
    <>
      {/* Slim iMessage header — translucent gray like real iOS */}
      <div
        className="flex flex-col items-center px-4 pt-2.5 pb-1.5 border-b border-black/5"
        style={{ backgroundColor: "#F6F6F6" }}
      >
        {/* Small circular avatar */}
        <div className="h-8 w-8 overflow-hidden rounded-full">
          <img
            src={example.petPhoto}
            alt={example.petName}
            className="h-full w-full object-cover"
          />
        </div>
        <p className="mt-0.5 text-[13px] font-bold text-black">
          {example.petName}
        </p>
        <p className="text-[9px] text-black/30">iMessage</p>
      </div>

      {/* Conversation area */}
      <div className="bg-white px-3 py-2.5" style={{ minHeight: "300px" }}>
        {example.messages.map((msg, i) => {
          if (i >= visibleCount) return null;
          const isOwner = msg.sender === "owner";
          const prevSender = i > 0 ? example.messages[i - 1].sender : null;
          const sameSender = prevSender === msg.sender;

          // [PHOTO] message → render as image bubble
          if (msg.text === "[PHOTO]") {
            return (
              <div
                key={`${example.id}-${i}`}
                className={`flex justify-start msg-pop ${sameSender ? "mt-0.5" : "mt-2"}`}
              >
                <div className="w-[58%] overflow-hidden rounded-2xl border border-black/5">
                  <img
                    src={example.petPhoto}
                    alt={example.petName}
                    className="w-full h-auto"
                  />
                </div>
              </div>
            );
          }

          return (
            <div
              key={`${example.id}-${i}`}
              className={`flex msg-pop ${
                isOwner ? "justify-end" : "justify-start"
              } ${sameSender ? "mt-0.5" : "mt-2"} ${msg.reaction ? "mb-2.5" : ""}`}
            >
              <div
                className={`relative inline-block max-w-[75%] rounded-2xl px-3.5 py-2 text-[14px] leading-snug ${
                  isOwner
                    ? "bg-[#007AFF] text-white"
                    : "bg-[#E9E9EB] text-black"
                }`}
              >
                {msg.text}
                {msg.reaction && (
                  <span
                    className={`absolute -bottom-2.5 ${
                      isOwner ? "left-1" : "right-1"
                    } rounded-full bg-white border border-black/10 px-1 py-0.5 text-[10px] leading-none shadow-sm`}
                  >
                    {msg.reaction}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {visibleCount >= 0 &&
          visibleCount < example.messages.length &&
          example.messages[visibleCount].sender === "pet" &&
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
    </>
  );
}

/** Caption/subtitle card — photo with text overlay */
function CaptionCard({
  example,
  visible,
}: {
  example: Extract<CarouselExample, { type: "caption" }>;
  visible: boolean;
}) {
  return (
    <div className="relative" style={{ minHeight: "360px" }}>
      <img
        src={example.petPhoto}
        alt={example.petName}
        className="h-full w-full object-cover"
        style={{ minHeight: "360px" }}
      />

      <div
        className="absolute inset-x-0 bottom-0 flex flex-col justify-end px-4 pb-4 pt-20"
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)",
        }}
      >
        <div
          className={`mb-2 transition-all duration-500 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          <span className="inline-block rounded-full bg-coral/90 px-3 py-0.5 text-[11px] font-bold text-white uppercase tracking-wide">
            {example.voiceLabel}
          </span>
        </div>

        <p
          className={`text-[17px] leading-snug font-semibold text-white transition-all duration-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
        >
          &ldquo;{example.caption}&rdquo;
        </p>

        <p
          className={`mt-1.5 text-sm text-white/70 font-semibold transition-all duration-500 delay-200 ${
            visible ? "opacity-100" : "opacity-0"
          }`}
        >
          — {example.petName}
        </p>
      </div>
    </div>
  );
}
