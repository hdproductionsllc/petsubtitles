"use client";

import QRCode from "qrcode";
import type { ConvoMessage } from "./anthropic";

const BRAND_NAME = "What My Pet Thinks";
const BRAND_URL = "whatmypetthinks.com";
const BRAND_FULL_URL = "https://whatmypetthinks.com";
const CORAL = "#FF6B4A";
const FOOTER_HEIGHT = 44;

interface CompositeResult {
  standardDataUrl: string;
  storyDataUrl: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image for compositing"));
    img.src = src;
  });
}

/** Wait for Google Fonts with a timeout fallback */
async function ensureFontsReady(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    await Promise.race([
      document.fonts.ready,
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
  } catch {
    // Proceed with system fonts
  }
}

/** Break text into lines that fit within maxWidth, with character-level fallback for long words */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    // Handle words that are individually wider than maxWidth
    if (ctx.measureText(word).width > maxWidth && currentLine === "") {
      let remaining = word;
      while (remaining.length > 0) {
        let end = remaining.length;
        while (end > 1 && ctx.measureText(remaining.slice(0, end)).width > maxWidth) {
          end--;
        }
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = remaining.slice(0, end);
        remaining = remaining.slice(end);
      }
      continue;
    }

    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/** Auto-size font to fit text within constraints */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
  startSize: number,
  minSize: number,
  fontFamily: string,
  bold = true
): { lines: string[]; fontSize: number } {
  let fontSize = startSize;

  while (fontSize >= minSize) {
    ctx.font = `${bold ? "bold " : ""}${fontSize}px ${fontFamily}`;
    const lines = wrapText(ctx, text, maxWidth);
    if (lines.length <= maxLines) {
      return { lines, fontSize };
    }
    fontSize -= 2;
  }

  // At minimum size, just use whatever lines we get
  ctx.font = `${bold ? "bold " : ""}${minSize}px ${fontFamily}`;
  return { lines: wrapText(ctx, text, maxWidth), fontSize: minSize };
}

/** Draw the standard format: original image + subtitle boxes + branded footer.
 *
 * Layout (top to bottom):
 * 1. Full pet photo at original aspect ratio
 * 2. Per-line semi-transparent dark rounded boxes near bottom (Netflix-style subtitles)
 * 3. White bold caption text rendered inside each box
 * 4. Coral footer bar APPENDED BELOW the photo (extra canvas height)
 */
function drawStandard(
  img: HTMLImageElement,
  caption: string
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const fontFamily = '"Nunito", "Segoe UI", Arial, sans-serif';

  // Footer bar sits BELOW the photo — adds to total canvas height
  const footerH = Math.max(FOOTER_HEIGHT, Math.round(w * 0.06));
  canvas.width = w;
  canvas.height = h + footerH;

  const ctx = canvas.getContext("2d")!;

  // 1. Draw the full photo
  ctx.drawImage(img, 0, 0);

  // 2. Caption text in per-line subtitle boxes (no gradient overlay)
  const padding = w * 0.06;
  const maxTextWidth = w - padding * 2;
  const minFontSize = Math.max(20, Math.round(w * 0.028));
  const { lines, fontSize } = fitText(
    ctx,
    caption,
    maxTextWidth,
    5,
    Math.round(w * 0.045),
    minFontSize,
    fontFamily
  );

  const boxPadH = Math.round(fontSize * 0.45); // horizontal padding
  const boxPadV = Math.round(fontSize * 0.25); // vertical padding
  const boxRadius = Math.max(8, Math.round(fontSize * 0.22));
  const lineHeight = fontSize * 1.3;
  const boxLineHeight = lineHeight + boxPadV * 2;
  const boxGap = Math.round(fontSize * 0.2);
  const textBlockHeight = lines.length * boxLineHeight + (lines.length - 1) * boxGap;
  const bottomPadding = h * 0.04;
  const blockStartY = Math.max(h * 0.15, h - bottomPadding - textBlockHeight);

  ctx.font = `bold ${fontSize}px ${fontFamily}`;
  ctx.textAlign = "center";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const textWidth = ctx.measureText(line).width;
    const boxW = textWidth + boxPadH * 2;
    const boxX = (w - boxW) / 2;
    const boxY = blockStartY + i * (boxLineHeight + boxGap);

    // Dark semi-transparent rounded box
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxLineHeight, boxRadius);
    ctx.fill();

    // White text centered in the box
    ctx.fillStyle = "white";
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 1;
    ctx.fillText(line, w / 2, boxY + boxPadV + lineHeight * 0.78);
  }

  // Reset shadow
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // 4. Branded footer — coral bar BELOW the photo
  ctx.fillStyle = CORAL;
  ctx.fillRect(0, h, w, footerH);

  const brandFontSize = Math.max(16, Math.round(w * 0.026));
  const ctaFontSize = Math.max(14, Math.round(w * 0.022));
  const footerCenterY = h + footerH * 0.62;
  ctx.fillStyle = "white";

  // Left: paw + whatmypetthinks.com
  ctx.textAlign = "left";
  ctx.font = `bold ${brandFontSize}px ${fontFamily}`;
  ctx.fillText(`🐾 ${BRAND_URL}`, padding, footerCenterY);

  // Right: CTA
  ctx.textAlign = "right";
  ctx.font = `${ctaFontSize}px ${fontFamily}`;
  ctx.fillText("Try it free \u2192", w - padding, footerCenterY);

  return canvas;
}

/** Generate a QR code as an Image element */
async function generateQRImage(url: string, size: number): Promise<HTMLImageElement> {
  const dataUrl = await QRCode.toDataURL(url, {
    width: size,
    margin: 1,
    color: { dark: "#FFFFFF", light: "#00000000" },
    errorCorrectionLevel: "M",
  });
  return loadImage(dataUrl);
}

/** Draw story format: 1080x1920 with gradient bg, centered photo, caption, CTA + QR */
async function drawStory(
  img: HTMLImageElement,
  caption: string
): Promise<HTMLCanvasElement> {
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Coral gradient background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, CORAL);
  bgGrad.addColorStop(1, "#E0452A");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  const fontFamily = '"Nunito", "Segoe UI", Arial, sans-serif';
  const displayFont = '"Fredoka", "Nunito", sans-serif';

  // Top logo
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.font = `bold 48px ${displayFont}`;
  ctx.fillText(`🐾 ${BRAND_NAME}`, W / 2, 100);

  // Pet photo — centered, with rounded corners and shadow
  const photoMaxW = W - 120;
  const photoMaxH = H * 0.5;
  let photoW = img.naturalWidth;
  let photoH = img.naturalHeight;
  const scale = Math.min(photoMaxW / photoW, photoMaxH / photoH);
  photoW = Math.round(photoW * scale);
  photoH = Math.round(photoH * scale);
  const photoX = (W - photoW) / 2;
  const photoY = 160;
  const cornerRadius = 24;

  // Shadow
  ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;

  // Rounded rect clip
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(photoX, photoY, photoW, photoH, cornerRadius);
  ctx.clip();
  ctx.drawImage(img, photoX, photoY, photoW, photoH);
  ctx.restore();

  // Reset shadow
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Caption below photo
  const captionY = photoY + photoH + 60;
  const captionMaxW = W - 120;
  const { lines, fontSize } = fitText(
    ctx,
    caption,
    captionMaxW,
    4,
    36,
    20,
    fontFamily
  );

  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.font = `bold ${fontSize}px ${fontFamily}`;
  ctx.shadowColor = "rgba(0, 0, 0, 0.2)";
  ctx.shadowBlur = 4;

  const lineHeight = fontSize * 1.4;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], W / 2, captionY + i * lineHeight);
  }

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;

  // CTA banner at bottom with QR code
  const ctaH = 200;
  const ctaY = H - ctaH;
  ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
  ctx.fillRect(0, ctaY, W, ctaH);

  // QR code on the right
  const qrSize = 120;
  try {
    const qrImg = await generateQRImage(BRAND_FULL_URL, qrSize);
    const qrX = W - qrSize - 40;
    const qrY = ctaY + (ctaH - qrSize) / 2;

    // QR background circle for contrast
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    ctx.beginPath();
    ctx.roundRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 16);
    ctx.fill();

    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  } catch {
    // QR generation failed — skip it, URL is still visible
  }

  // CTA text — left-aligned to balance with QR on the right
  const textAreaW = W - qrSize - 120;
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.font = `bold 30px ${fontFamily}`;
  ctx.fillText("What your pet is really thinking \uD83D\uDC3E", textAreaW / 2 + 40, ctaY + 65);

  ctx.font = `bold 26px ${fontFamily}`;
  ctx.globalAlpha = 0.9;
  ctx.fillText(`TRY IT ON YOUR PET \u2192 ${BRAND_URL}`, textAreaW / 2 + 40, ctaY + 115);
  ctx.globalAlpha = 1;

  // Small "Scan to try" label under QR
  ctx.font = `14px ${fontFamily}`;
  ctx.globalAlpha = 0.7;
  ctx.textAlign = "center";
  ctx.fillText("Scan to try", W - qrSize / 2 - 40, ctaY + (ctaH + qrSize) / 2 + 20);
  ctx.globalAlpha = 1;

  return canvas;
}

/** Voice label map for battle mode */
const VOICE_LABELS: Record<string, { label: string; emoji: string }> = {
  funny: { label: "Funny", emoji: "😂" },
  dramatic: { label: "Narrator", emoji: "🎬" },
  genz: { label: "Gen-Z", emoji: "💀" },
  shakespeare: { label: "Shakespeare", emoji: "🎭" },
  passive: { label: "Passive Agg", emoji: "😒" },
  therapist: { label: "Therapist", emoji: "🧠" },
  telenovela: { label: "Telenovela", emoji: "🌹" },
};

export interface BattleEntry {
  voiceId: string;
  caption: string;
}

/** Draw caption battle: pet photo with 3 voice captions side by side */
async function drawBattle(
  img: HTMLImageElement,
  entries: BattleEntry[]
): Promise<HTMLCanvasElement> {
  const W = 1080;
  const fontFamily = '"Nunito", "Segoe UI", Arial, sans-serif';
  const displayFont = '"Fredoka", "Nunito", sans-serif';

  // Layout calculations
  const headerH = 80;
  const photoMaxH = 700;
  const photoGap = 30;
  const cardPadding = 24;
  const cardGap = 14;
  const footerH = 60;

  // Calculate photo dimensions
  const photoMaxW = W - 80;
  let photoW = img.naturalWidth;
  let photoH = img.naturalHeight;
  const photoScale = Math.min(photoMaxW / photoW, photoMaxH / photoH);
  photoW = Math.round(photoW * photoScale);
  photoH = Math.round(photoH * photoScale);

  // Calculate caption card heights — need a temporary canvas to measure text
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = W;
  tempCanvas.height = 100;
  const tempCtx = tempCanvas.getContext("2d")!;
  const captionMaxW = W - cardPadding * 4;

  const cardData: { entry: BattleEntry; lines: string[]; fontSize: number; cardH: number }[] = [];

  for (const entry of entries) {
    const { lines, fontSize } = fitText(tempCtx, entry.caption, captionMaxW, 4, 24, 16, fontFamily);
    const lineHeight = fontSize * 1.35;
    const labelH = 36; // voice label row
    const textH = lines.length * lineHeight;
    const cardH = labelH + textH + cardPadding * 1.5;
    cardData.push({ entry, lines, fontSize, cardH });
  }

  const maxCardH = Math.max(...cardData.map(c => c.cardH));
  const totalCardsH = cardData.length * (maxCardH + cardGap) - cardGap;

  const H = headerH + photoH + photoGap + totalCardsH + photoGap + footerH;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background gradient — coral
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, CORAL);
  bgGrad.addColorStop(1, "#E0452A");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Header
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.font = `bold 42px ${displayFont}`;
  ctx.fillText("\uD83D\uDC3E Caption Battle", W / 2, 65);

  // Pet photo with rounded corners
  const photoX = (W - photoW) / 2;
  const photoY = headerH;

  ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 6;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(photoX, photoY, photoW, photoH, 20);
  ctx.clip();
  ctx.drawImage(img, photoX, photoY, photoW, photoH);
  ctx.restore();

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Caption cards
  let cardY = photoY + photoH + photoGap;
  const cardX = 40;
  const cardW = W - 80;

  const voiceColors = ["#EF4444", "#3B82F6", "#10B981", "#8B5CF6", "#EC4899", "#F59E0B", "#14B8A6"];

  for (let i = 0; i < cardData.length; i++) {
    const { entry, lines, fontSize } = cardData[i];
    const voice = VOICE_LABELS[entry.voiceId] || { label: entry.voiceId, emoji: "🎤" };
    const accentColor = voiceColors[i % voiceColors.length];

    // Card background
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, maxCardH, 16);
    ctx.fill();

    // Accent bar on left
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, 6, maxCardH, [16, 0, 0, 16]);
    ctx.fill();

    // Voice label
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.textAlign = "left";
    ctx.font = `bold 20px ${fontFamily}`;
    ctx.fillText(`${voice.emoji} ${voice.label}`, cardX + cardPadding, cardY + 28);

    // Caption text
    ctx.fillStyle = "white";
    ctx.font = `${fontSize}px ${fontFamily}`;
    const lineHeight = fontSize * 1.35;
    for (let j = 0; j < lines.length; j++) {
      ctx.fillText(lines[j], cardX + cardPadding, cardY + 36 + 20 + j * lineHeight);
    }

    cardY += maxCardH + cardGap;
  }

  // Footer — coral bar
  const footerY = H - footerH;
  ctx.fillStyle = CORAL;
  ctx.fillRect(0, footerY, W, footerH);

  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.font = `bold 24px ${fontFamily}`;
  ctx.fillText(`\uD83D\uDC3E ${BRAND_URL}  \u00B7  Try it free \u2192`, W / 2, footerY + footerH * 0.6);

  return canvas;
}

/** Draw iMessage-style text conversation with pet photo */
function drawConvo(
  img: HTMLImageElement,
  messages: ConvoMessage[],
  petName: string
): HTMLCanvasElement {
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const fontFamily = '"Nunito", "Segoe UI", Arial, sans-serif';

  // === TOP SECTION: Dark background with pet photo ===
  const headerH = 640;
  const darkGrad = ctx.createLinearGradient(0, 0, 0, headerH);
  darkGrad.addColorStop(0, "#1A1A2E");
  darkGrad.addColorStop(1, "#16213E");
  ctx.fillStyle = darkGrad;
  ctx.fillRect(0, 0, W, headerH);

  // Status bar
  ctx.fillStyle = "#FFFFFF";
  ctx.globalAlpha = 0.7;
  ctx.font = `bold 28px ${fontFamily}`;
  ctx.textAlign = "left";
  ctx.fillText("9:41", 32, 38);
  const signalX = W - 32;
  const signalY = 22;
  for (let i = 0; i < 4; i++) {
    const barH = 10 + i * 4;
    ctx.fillRect(signalX - 80 + i * 14, signalY + (22 - barH), 8, barH);
  }
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.roundRect(signalX - 10, signalY, 42, 20, 4);
  ctx.fill();
  ctx.fillStyle = "#34C759";
  ctx.beginPath();
  ctx.roundRect(signalX - 8, signalY + 2, 36, 16, 3);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Circular pet photo with shadow
  const photoSize = 360;
  const photoX = (W - photoSize) / 2;
  const photoY = 80;
  const photoCenterX = W / 2;
  const photoCenterY = photoY + photoSize / 2;

  ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
  ctx.beginPath();
  ctx.arc(photoCenterX, photoCenterY, photoSize / 2 + 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Clip and draw photo in circle (center-crop)
  ctx.save();
  ctx.beginPath();
  ctx.arc(photoCenterX, photoCenterY, photoSize / 2, 0, Math.PI * 2);
  ctx.clip();
  const imgAspect = img.naturalWidth / img.naturalHeight;
  let drawW: number, drawH: number, drawX: number, drawY: number;
  if (imgAspect > 1) {
    drawH = photoSize;
    drawW = photoSize * imgAspect;
    drawX = photoX - (drawW - photoSize) / 2;
    drawY = photoY;
  } else {
    drawW = photoSize;
    drawH = photoSize / imgAspect;
    drawX = photoX;
    drawY = photoY - (drawH - photoSize) / 2;
  }
  ctx.drawImage(img, drawX, drawY, drawW, drawH);
  ctx.restore();

  // Pet name below photo
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.font = `bold 42px ${fontFamily}`;
  ctx.fillText(petName, W / 2, photoY + photoSize + 50);

  // "iMessage" label
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.font = `24px ${fontFamily}`;
  ctx.fillText("iMessage", W / 2, photoY + photoSize + 85);

  // === BOTTOM SECTION: White background ===
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, headerH, W, H - headerH);

  // === MESSAGE BUBBLES — top-aligned ===
  const msgAreaTop = headerH + 24;
  const msgMaxWidth = Math.round(W * 0.63);
  const bubblePadH = 24;
  const bubblePadV = 14;
  const bubbleRadius = 18;
  const fontSize = 28;
  const lineHeight = fontSize * 1.35;
  const sameSenderGap = 6;
  const diffSenderGap = 16;

  ctx.font = `${fontSize}px ${fontFamily}`;

  let curY = msgAreaTop;
  let lastOwnerBubbleBottomY = 0;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const textMaxW = msgMaxWidth - bubblePadH * 2;
    const lines = wrapText(ctx, msg.text, textMaxW);
    const textH = lines.length * lineHeight;
    const bubbleW = Math.min(
      msgMaxWidth,
      Math.max(...lines.map((l) => ctx.measureText(l).width)) + bubblePadH * 2
    );
    const bubbleH = textH + bubblePadV * 2;

    if (i > 0) {
      curY += msg.sender === messages[i - 1].sender ? sameSenderGap : diffSenderGap;
    }

    const isOwner = msg.sender === "owner";
    const bubbleX = isOwner ? W - 24 - bubbleW : 24;

    ctx.fillStyle = isOwner ? "#007AFF" : "#E9E9EB";
    ctx.beginPath();
    ctx.roundRect(bubbleX, curY, bubbleW, bubbleH, bubbleRadius);
    ctx.fill();

    ctx.fillStyle = isOwner ? "#FFFFFF" : "#000000";
    ctx.textAlign = "left";
    ctx.font = `${fontSize}px ${fontFamily}`;
    for (let j = 0; j < lines.length; j++) {
      ctx.fillText(
        lines[j],
        bubbleX + bubblePadH,
        curY + bubblePadV + (j + 1) * lineHeight - fontSize * 0.25
      );
    }

    if (isOwner) {
      lastOwnerBubbleBottomY = curY + bubbleH;
    }

    curY += bubbleH;
  }

  // "Delivered" text after last owner message
  if (lastOwnerBubbleBottomY > 0) {
    ctx.fillStyle = "#8E8E93";
    ctx.font = `18px ${fontFamily}`;
    ctx.textAlign = "right";
    ctx.fillText("Delivered", W - 28, lastOwnerBubbleBottomY + 22);
  }

  // --- 4. Brand footer (1820-1920px) ---
  ctx.fillStyle = CORAL;
  ctx.fillRect(0, 1820, W, 100);

  const brandFontSize = 28;
  const ctaFontSize = 22;
  ctx.fillStyle = "white";
  ctx.textAlign = "left";
  ctx.font = `bold ${brandFontSize}px ${fontFamily}`;
  ctx.fillText(`🐾 ${BRAND_URL}`, 32, 1880);

  ctx.textAlign = "right";
  ctx.font = `${ctaFontSize}px ${fontFamily}`;
  ctx.fillText("Try it free \u2192", W - 32, 1880);

  return canvas;
}

/** Composite an iMessage conversation screenshot */
export async function compositeConvo(
  originalDataUrl: string,
  messages: ConvoMessage[],
  petName?: string
): Promise<CompositeResult> {
  await ensureFontsReady();

  const img = await loadImage(originalDataUrl);
  const contactName = petName || "Pet";
  const convoCanvas = drawConvo(img, messages, contactName);
  const dataUrl = convoCanvas.toDataURL("image/png");

  // Both standard and story return the same image (already 1080x1920 = 9:16)
  return {
    standardDataUrl: dataUrl,
    storyDataUrl: dataUrl,
  };
}

export async function compositeSubtitles(
  originalDataUrl: string,
  caption: string
): Promise<CompositeResult> {
  await ensureFontsReady();

  const img = await loadImage(originalDataUrl);

  const standardCanvas = drawStandard(img, caption);
  const storyCanvas = await drawStory(img, caption);

  return {
    standardDataUrl: standardCanvas.toDataURL("image/png"),
    storyDataUrl: storyCanvas.toDataURL("image/jpeg", 0.92),
  };
}

/** Composite a caption battle image showing multiple voice results */
export async function compositeBattle(
  originalDataUrl: string,
  entries: BattleEntry[]
): Promise<string> {
  await ensureFontsReady();
  const img = await loadImage(originalDataUrl);
  const battleCanvas = await drawBattle(img, entries);
  return battleCanvas.toDataURL("image/jpeg", 0.92);
}
