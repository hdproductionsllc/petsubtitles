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

/** Measure the height needed for a meme text bar (black bar with white text) */
function measureBarHeight(
  ctx: CanvasRenderingContext2D,
  text: string,
  w: number,
  fontFamily: string
): { lines: string[]; fontSize: number; barH: number } {
  const padding = w * 0.06;
  const maxTextWidth = w - padding * 2;
  const startSize = Math.round(w * 0.05);
  const minSize = Math.round(w * 0.03);

  const { lines, fontSize } = fitText(
    ctx,
    text.toUpperCase(),
    maxTextWidth,
    3,
    startSize,
    minSize,
    fontFamily,
    false // Anton is not bold — it's already heavy
  );

  const lineHeight = fontSize * 1.25;
  const vertPad = fontSize * 0.5;
  const barH = lines.length * lineHeight + vertPad * 2;

  return { lines, fontSize, barH };
}

/** Draw a meme text bar (black bg, white centered text) */
function drawBar(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  fontSize: number,
  x: number,
  y: number,
  w: number,
  barH: number,
  fontFamily: string
): void {
  ctx.fillStyle = "#000000";
  ctx.fillRect(x, y, w, barH);

  const lineHeight = fontSize * 1.25;
  const vertPad = fontSize * 0.5;

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.textAlign = "center";

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(
      lines[i],
      x + w / 2,
      y + vertPad + (i + 1) * lineHeight - fontSize * 0.15
    );
  }
}

/** Core meme renderer: top bar + photo + bottom bar. Returns canvas and dimensions. */
function drawMemeCore(
  img: HTMLImageElement,
  top: string,
  bottom: string
): HTMLCanvasElement {
  const w = img.naturalWidth;
  const fontFamily = '"Anton", Impact, sans-serif';

  // Use a temp canvas to measure text bar heights
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = w;
  tempCanvas.height = 100;
  const tempCtx = tempCanvas.getContext("2d")!;

  const topBar = measureBarHeight(tempCtx, top, w, fontFamily);
  const bottomBar = measureBarHeight(tempCtx, bottom, w, fontFamily);

  const photoH = img.naturalHeight;
  const totalH = topBar.barH + photoH + bottomBar.barH;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = totalH;
  const ctx = canvas.getContext("2d")!;

  // 1. Top black bar with setup text
  drawBar(ctx, topBar.lines, topBar.fontSize, 0, 0, w, topBar.barH, fontFamily);

  // 2. Full pet photo, unmodified
  ctx.drawImage(img, 0, topBar.barH);

  // 3. Bottom black bar with punchline
  drawBar(ctx, bottomBar.lines, bottomBar.fontSize, 0, topBar.barH + photoH, w, bottomBar.barH, fontFamily);

  return canvas;
}

/** Draw the meme format: black top bar → photo → black bottom bar → coral footer */
function drawMeme(
  img: HTMLImageElement,
  top: string,
  bottom: string
): HTMLCanvasElement {
  const memeCanvas = drawMemeCore(img, top, bottom);
  const w = memeCanvas.width;
  const memeH = memeCanvas.height;
  const fontFamily = '"Nunito", "Segoe UI", Arial, sans-serif';

  // Add coral footer below the meme
  const footerH = Math.max(FOOTER_HEIGHT, Math.round(w * 0.06));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = memeH + footerH;
  const ctx = canvas.getContext("2d")!;

  // Draw the meme
  ctx.drawImage(memeCanvas, 0, 0);

  // Coral footer bar
  ctx.fillStyle = CORAL;
  ctx.fillRect(0, memeH, w, footerH);

  const padding = w * 0.06;
  const brandFontSize = Math.max(16, Math.round(w * 0.026));
  const ctaFontSize = Math.max(14, Math.round(w * 0.022));
  const footerCenterY = memeH + footerH * 0.62;
  ctx.fillStyle = "white";

  ctx.textAlign = "left";
  ctx.font = `bold ${brandFontSize}px ${fontFamily}`;
  ctx.fillText(`🐾 ${BRAND_URL}`, padding, footerCenterY);

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

/** Draw story format: 1080x1920 with coral gradient bg, centered meme, logo + CTA */
async function drawStory(
  img: HTMLImageElement,
  top: string,
  bottom: string
): Promise<HTMLCanvasElement> {
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const fontFamily = '"Nunito", "Segoe UI", Arial, sans-serif';
  const displayFont = '"Fredoka", "Nunito", sans-serif';

  // Coral gradient background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, CORAL);
  bgGrad.addColorStop(1, "#E0452A");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Top logo
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.font = `bold 48px ${displayFont}`;
  ctx.fillText(`🐾 ${BRAND_NAME}`, W / 2, 100);

  // Render the meme core (top bar + photo + bottom bar)
  const memeCanvas = drawMemeCore(img, top, bottom);

  // Scale meme to fit within story canvas with padding
  const memeMaxW = W - 80;
  const memeMaxH = H - 360; // leave room for logo (top) and CTA (bottom)
  const memeScale = Math.min(memeMaxW / memeCanvas.width, memeMaxH / memeCanvas.height);
  const memeW = Math.round(memeCanvas.width * memeScale);
  const memeH = Math.round(memeCanvas.height * memeScale);
  const memeX = (W - memeW) / 2;
  const memeY = 140;

  // Shadow behind the meme
  ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;
  ctx.drawImage(memeCanvas, memeX, memeY, memeW, memeH);

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

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

    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    ctx.beginPath();
    ctx.roundRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 16);
    ctx.fill();

    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  } catch {
    // QR generation failed — skip it
  }

  // CTA text
  const textAreaW = W - qrSize - 120;
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.font = `bold 30px ${fontFamily}`;
  ctx.fillText("What your pet is really thinking \uD83D\uDC3E", textAreaW / 2 + 40, ctaY + 65);

  ctx.font = `bold 26px ${fontFamily}`;
  ctx.globalAlpha = 0.9;
  ctx.fillText(`TRY IT ON YOUR PET \u2192 ${BRAND_URL}`, textAreaW / 2 + 40, ctaY + 115);
  ctx.globalAlpha = 1;

  // "Scan to try" label under QR
  ctx.font = `14px ${fontFamily}`;
  ctx.globalAlpha = 0.7;
  ctx.textAlign = "center";
  ctx.fillText("Scan to try", W - qrSize / 2 - 40, ctaY + (ctaH + qrSize) / 2 + 20);
  ctx.globalAlpha = 1;

  return canvas;
}

/** Voice label map for battle mode */
const VOICE_LABELS: Record<string, { label: string; emoji: string }> = {
  funny: { label: "Silly", emoji: "😂" },
  passive: { label: "Passive Agg", emoji: "😒" },
  genz: { label: "Gen-Z", emoji: "💀" },
  dramatic: { label: "Dramatic Narrator", emoji: "🎬" },
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

/** Draw iMessage-style text conversation with pet photo as first image bubble */
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

  // === SLIM HEADER: translucent gray like real iMessage ===
  const headerH = 190;
  ctx.fillStyle = "#F6F6F6";
  ctx.fillRect(0, 0, W, headerH);
  // Subtle bottom border
  ctx.fillStyle = "#D1D1D6";
  ctx.fillRect(0, headerH - 1, W, 1);

  // Status bar (dark text on light bg)
  ctx.fillStyle = "#000000";
  ctx.globalAlpha = 0.8;
  ctx.font = `bold 28px ${fontFamily}`;
  ctx.textAlign = "left";
  ctx.fillText("9:41", 32, 38);
  const signalX = W - 32;
  const signalY = 22;
  for (let i = 0; i < 4; i++) {
    const barH = 10 + i * 4;
    ctx.fillRect(signalX - 80 + i * 14, signalY + (22 - barH), 8, barH);
  }
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.roundRect(signalX - 10, signalY, 42, 20, 4);
  ctx.fill();
  ctx.fillStyle = "#34C759";
  ctx.beginPath();
  ctx.roundRect(signalX - 8, signalY + 2, 36, 16, 3);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Back arrow
  ctx.fillStyle = "#007AFF";
  ctx.font = `bold 36px ${fontFamily}`;
  ctx.textAlign = "left";
  ctx.fillText("\u2039", 24, 90);

  // Small circular avatar in header
  const avatarSize = 52;
  const avatarX = W / 2;
  const avatarY = 88;
  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
  ctx.clip();
  const avAspect = img.naturalWidth / img.naturalHeight;
  if (avAspect > 1) {
    const avH = avatarSize;
    const avW = avatarSize * avAspect;
    ctx.drawImage(img, avatarX - avW / 2, avatarY - avH / 2, avW, avH);
  } else {
    const avW = avatarSize;
    const avH = avatarSize / avAspect;
    ctx.drawImage(img, avatarX - avW / 2, avatarY - avH / 2, avW, avH);
  }
  ctx.restore();

  // Pet name below avatar
  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.font = `bold 30px ${fontFamily}`;
  ctx.fillText(petName, W / 2, avatarY + avatarSize / 2 + 28);

  // "iMessage" label
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.font = `20px ${fontFamily}`;
  ctx.fillText("iMessage", W / 2, avatarY + avatarSize / 2 + 52);

  // === WHITE MESSAGE AREA ===
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, headerH, W, H - headerH);

  // === MESSAGE BUBBLES + PHOTO BUBBLE ===
  const bubbleMargin = 32;
  const msgMaxWidth = Math.round(W * 0.72);
  const bubblePadH = 30;
  const bubblePadV = 18;
  const bubbleRadius = 22;
  const fontSize = 36;
  const lineHeight = fontSize * 1.35;
  const sameSenderGap = 10;
  const diffSenderGap = 24;

  // Photo bubble dimensions (full image, no crop)
  const imgBubbleMaxW = Math.round(W * 0.58);
  const imgBubbleRadius = 20;
  const imgAspect = img.naturalWidth / img.naturalHeight;
  const photoW = imgBubbleMaxW;
  const photoH = Math.round(photoW / imgAspect);

  ctx.font = `${fontSize}px ${fontFamily}`;

  let curY = headerH + 24;
  let lastOwnerBubbleBottomY = 0;
  let prevSender: string | null = null;

  // Track bubble positions for reactions
  const bubblePositions: { x: number; y: number; w: number; h: number; sender: string; idx: number }[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    // Gap between messages
    if (prevSender !== null) {
      curY += msg.sender === prevSender ? sameSenderGap : diffSenderGap;
    }

    if (msg.text === "[PHOTO]") {
      // Render pet photo as image bubble (left-aligned, full image)
      const imgX = bubbleMargin;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(imgX, curY, photoW, photoH, imgBubbleRadius);
      ctx.clip();
      ctx.drawImage(img, imgX, curY, photoW, photoH);
      ctx.restore();

      // Subtle border
      ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(imgX, curY, photoW, photoH, imgBubbleRadius);
      ctx.stroke();

      bubblePositions.push({ x: imgX, y: curY, w: photoW, h: photoH, sender: "pet", idx: i });
      curY += photoH;
      prevSender = "pet";
    } else {
      // Normal text bubble
      const textMaxW = msgMaxWidth - bubblePadH * 2;
      const lines = wrapText(ctx, msg.text, textMaxW);
      const textH = lines.length * lineHeight;
      const bubbleW = Math.min(
        msgMaxWidth,
        Math.max(...lines.map((l) => ctx.measureText(l).width)) + bubblePadH * 2
      );
      const bubbleH = textH + bubblePadV * 2;

      const isOwner = msg.sender === "owner";
      const bubbleX = isOwner ? W - bubbleMargin - bubbleW : bubbleMargin;

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

      bubblePositions.push({ x: bubbleX, y: curY, w: bubbleW, h: bubbleH, sender: msg.sender, idx: i });

      if (isOwner) {
        lastOwnerBubbleBottomY = curY + bubbleH;
      }

      curY += bubbleH;
      prevSender = msg.sender;
    }
  }

  // "Delivered" text after last owner message
  if (lastOwnerBubbleBottomY > 0) {
    ctx.fillStyle = "#8E8E93";
    ctx.font = `22px ${fontFamily}`;
    ctx.textAlign = "right";
    ctx.fillText("Delivered", W - bubbleMargin, lastOwnerBubbleBottomY + 28);
  }

  // === EMOJI REACTIONS (Tapbacks) — driven by AI ===
  const reactionsToRender: { bubble: typeof bubblePositions[0]; emoji: string }[] = [];
  for (const bp of bubblePositions) {
    const msg = messages[bp.idx];
    if (msg.reaction) {
      reactionsToRender.push({ bubble: bp, emoji: msg.reaction });
    }
  }

  for (const { bubble, emoji } of reactionsToRender) {
    const pillW = 44;
    const pillH = 36;
    const isPet = bubble.sender === "pet";
    // Position: top-right for pet bubbles, top-left for owner bubbles
    const pillX = isPet
      ? bubble.x + bubble.w - pillW + 8
      : bubble.x - 8;
    const pillY = bubble.y - pillH / 2 - 2;

    // Pill background with border
    ctx.fillStyle = "#F2F2F7";
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.strokeStyle = "#D1D1D6";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2);
    ctx.stroke();

    // Emoji
    ctx.font = "20px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#000000";
    ctx.fillText(emoji, pillX + pillW / 2, pillY + pillH / 2 + 7);
  }

  // --- Brand footer — positioned below last message with padding ---
  const footerTop = Math.max(curY + 60, 1820);
  ctx.fillStyle = CORAL;
  ctx.fillRect(0, footerTop, W, H - footerTop);

  const brandFontSize = 28;
  const ctaFontSize = 22;
  ctx.fillStyle = "white";
  ctx.textAlign = "left";
  ctx.font = `bold ${brandFontSize}px ${fontFamily}`;
  const footerCenterY = footerTop + (H - footerTop) / 2 + 10;
  ctx.fillText(`🐾 ${BRAND_URL}`, 32, footerCenterY);

  ctx.textAlign = "right";
  ctx.font = `${ctaFontSize}px ${fontFamily}`;
  ctx.fillText("Try it free \u2192", W - 32, footerCenterY);

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
  caption: { top: string; bottom: string }
): Promise<CompositeResult> {
  await ensureFontsReady();

  const img = await loadImage(originalDataUrl);

  const standardCanvas = drawMeme(img, caption.top, caption.bottom);
  const storyCanvas = await drawStory(img, caption.top, caption.bottom);

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
