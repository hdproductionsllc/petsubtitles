"use client";

interface Props {
  imageDataUrl: string;
  caption: string;
  hideCaption?: boolean;
}

export default function ResultDisplay({ imageDataUrl, caption, hideCaption }: Props) {
  return (
    <div className="px-2 animate-fade-up">
      <div className="overflow-hidden rounded-2xl shadow-xl">
        <img
          src={imageDataUrl}
          alt={`Pet photo with subtitle: ${caption}`}
          className="w-full"
        />
      </div>
      {!hideCaption && (
        <p className="mt-2 text-center text-sm text-charcoal-light italic">
          &quot;{caption}&quot;
        </p>
      )}
    </div>
  );
}
