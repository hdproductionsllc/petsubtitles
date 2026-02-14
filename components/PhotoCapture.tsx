"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

const SAMPLE_CAPTIONS = [
  "I have been a good boy for 47 seconds. Where is my treat.",
  "They put me in this sweater and expect me to maintain my dignity.",
  "The baby gets carried everywhere but when I jump on the counter suddenly it's a problem.",
  "I don't know who told you I ate the couch cushion but they're lying.",
  "This is my spot. I was here first. The fact that you bought the couch is irrelevant.",
  "You've been gone for 11 minutes. I assumed you were dead.",
];

export interface PhotoCaptureHandle {
  openFilePicker: () => void;
}

interface Props {
  onImageSelected: (file: File) => void;
  previewUrl: string | null;
  onClear: () => void;
  isConverting: boolean;
}

const PhotoCapture = forwardRef<PhotoCaptureHandle, Props>(function PhotoCapture(
  { onImageSelected, previewUrl, onClear, isConverting },
  ref
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [sampleIndex, setSampleIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useImperativeHandle(ref, () => ({
    openFilePicker: () => inputRef.current?.click(),
  }));

  // Rotate sample captions
  useEffect(() => {
    const interval = setInterval(() => {
      setSampleIndex((prev) => (prev + 1) % SAMPLE_CAPTIONS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      if (file.type.startsWith("image/") || file.name.match(/\.(heic|heif)$/i)) {
        onImageSelected(file);
      }
    },
    [onImageSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  if (isConverting) {
    return (
      <>
        <div className="mx-4 flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-amber/40 bg-amber/5 p-12">
          <div className="flex gap-1.5">
            <span className="paw-dot" />
            <span className="paw-dot" />
            <span className="paw-dot" />
          </div>
          <p className="mt-3 text-sm font-semibold text-amber-dark">
            Converting iPhone photo...
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
          className="hidden"
          aria-hidden="true"
        />
      </>
    );
  }

  if (previewUrl) {
    return (
      <>
        <div className="relative mx-4">
          <img
            src={previewUrl}
            alt="Selected pet photo"
            className="w-full rounded-3xl shadow-lg"
            style={{ maxHeight: "60vh", objectFit: "contain" }}
          />
          <button
            onClick={onClear}
            className="absolute right-3 top-3 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition hover:bg-black/70"
            aria-label="Remove photo"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
          className="hidden"
          aria-hidden="true"
        />
      </>
    );
  }

  return (
    <div className="px-4">
      <div
        className={`flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-10 transition-all ${
          isDragging
            ? "border-amber bg-amber/10"
            : "border-gray-300 bg-white hover:border-amber/50 hover:bg-amber/5"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        aria-label="Upload a pet photo"
      >
        {/* Camera icon */}
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#F59E0B"
          strokeWidth="1.5"
          className="mb-4"
        >
          <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>

        <p className="font-[family-name:var(--font-display)] text-lg font-bold text-charcoal">
          Upload your pet&apos;s photo
        </p>
        <p className="mt-1 text-sm text-charcoal-light">
          Tap to take or choose a photo
        </p>

        {/* Rotating sample caption */}
        <div className="mt-4 rounded-xl bg-charcoal/5 px-4 py-2">
          <p className="animate-fade-in text-center text-xs text-charcoal-light italic">
            &quot;{SAMPLE_CAPTIONS[sampleIndex]}&quot;
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
});

export default PhotoCapture;
