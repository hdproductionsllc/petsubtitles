"use client";

import { useEffect, useState } from "react";
import { SAMPLE_EXAMPLES } from "@/lib/sampleData";

interface Props {
  onTryIt: () => void;
}

export default function ExampleCarousel({ onTryIt }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % SAMPLE_EXAMPLES.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const example = SAMPLE_EXAMPLES[activeIndex];

  return (
    <div className="px-4 py-2">
      {/* Headline */}
      <h2 className="font-[family-name:var(--font-display)] text-center text-2xl font-bold text-charcoal mb-1">
        What is your pet <span className="text-coral">REALLY</span> thinking?
      </h2>
      <p className="text-center text-sm text-charcoal-light mb-4">
        Your pet has opinions. Now they have subtitles.
      </p>

      {/* Example card — real composited image */}
      <div className="relative overflow-hidden rounded-3xl shadow-xl">
        <img
          key={example.id}
          src={example.image}
          alt={`${example.petType}: "${example.caption}"`}
          className="w-full animate-crossfade-in"
          loading="eager"
        />
        {/* Pet type tag */}
        <div className="absolute left-3 top-3 rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-charcoal backdrop-blur-sm shadow-sm">
          {example.petType}
        </div>
        {/* Voice style tag */}
        <div className="absolute right-3 top-3 rounded-full bg-coral/90 px-3 py-1 text-xs font-bold text-white shadow-sm">
          {example.voiceEmoji} {example.voiceStyle}
        </div>
      </div>

      {/* Dots indicator */}
      <div className="mt-3 flex justify-center gap-1.5">
        {SAMPLE_EXAMPLES.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === activeIndex ? "w-6 bg-coral" : "w-1.5 bg-charcoal/20"
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
        Try It Free — Upload Your Pet
      </button>
    </div>
  );
}
