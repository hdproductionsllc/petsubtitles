"use client";

/** Only use Web Share API on mobile/tablet — desktop should show platform buttons */
export function canUseWebShare(): boolean {
  if (typeof navigator === "undefined" || !navigator.share) return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/** Generate descriptive filename: whatmypetthinks-funny-20260213-143022.png */
export function generateFilename(voiceStyle?: string, isStory?: boolean, isConvo?: boolean): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const time = now.toTimeString().slice(0, 8).replace(/:/g, "");
  const voice = voiceStyle || "funny";
  const prefix = isConvo ? "whatmypetthinks-convo" : "whatmypetthinks";
  const suffix = isStory ? "-story" : "";
  return `${prefix}-${voice}${suffix}-${date}-${time}.png`;
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

export async function shareImage(
  dataUrl: string,
  caption: string,
  voiceStyle?: string,
  isStory?: boolean,
  isConvo?: boolean
): Promise<boolean> {
  if (!canUseWebShare()) return false;

  try {
    const blob = await dataUrlToBlob(dataUrl);
    const filename = generateFilename(voiceStyle, isStory, isConvo);
    const file = new File([blob], filename, { type: "image/png" });

    const text = isConvo
      ? "My pet started texting me 😂 #WhatMyPetThinks\n\nhttps://whatmypetthinks.com"
      : "Look what my pet thinks 😂 #WhatMyPetThinks\n\nhttps://whatmypetthinks.com";

    await navigator.share({
      title: "What My Pet Thinks",
      text,
      url: "https://whatmypetthinks.com",
      files: [file],
    });
    return true;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return false; // user cancelled — not an error
    }
    throw err;
  }
}

export async function downloadImage(dataUrl: string, filename?: string) {
  // On iOS, anchor download saves to Files — use share sheet instead so
  // the user gets "Save Image" which saves to camera roll.
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent) && navigator.share) {
    try {
      const blob = await dataUrlToBlob(dataUrl);
      const file = new File([blob], filename || generateFilename(), { type: "image/png" });
      await navigator.share({ files: [file] });
      return;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      // Fall through to anchor download if share fails
    }
  }

  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename || generateFilename();
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function copyLinkToClipboard(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText("https://whatmypetthinks.com");
    return true;
  } catch {
    return false;
  }
}

// --- Platform-specific sharing ---

/** Open Instagram with web fallback */
export function openInstagram(): void {
  window.location.href = "instagram://camera";
  setTimeout(() => {
    window.open("https://www.instagram.com/", "_blank");
  }, 1500);
}

/** Open TikTok with web fallback */
export function openTikTok(): void {
  window.location.href = "tiktok://";
  setTimeout(() => {
    window.open("https://www.tiktok.com/", "_blank");
  }, 1500);
}

/** Open X/Twitter tweet compose with pre-filled text */
export function shareToX(caption: string, isConvo?: boolean): void {
  const text = isConvo
    ? "My pet started texting me and I can't 😂 #WhatMyPetThinks whatmypetthinks.com"
    : `"${caption}" 😂\n\nFind out what your pet thinks 😂 #WhatMyPetThinks whatmypetthinks.com`;
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}

/** Open Facebook sharer */
export function shareToFacebook(): void {
  const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent("https://whatmypetthinks.com")}`;
  window.open(url, "_blank");
}
