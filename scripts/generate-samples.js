/**
 * Generate pre-composited sample images for the ExampleCarousel and SocialProof.
 * Uses sharp to composite captions + coral footer onto real pet photos.
 *
 * Usage: node scripts/generate-samples.js
 */

const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const CORAL = "#FF6B4A";
const BRAND_URL = "whatmypetthinks.com";

const SAMPLES = [
  {
    id: "dog-guilty",
    file: "dog-guilty.jpg",
    caption: "I didn't do it. But hypothetically, if I DID eat that shoe, it had it coming.",
    voiceStyle: "Funny",
    petType: "Pug",
  },
  {
    id: "cat-judging",
    file: "cat-judging.jpg",
    caption: "I've been watching you type for 20 minutes. Not a single email about me.",
    voiceStyle: "Passive Agg",
    petType: "Tabby Cat",
  },
  {
    id: "puppy-mess",
    file: "puppy-mess.jpg",
    caption: "In my defense, that pillow was looking at me weird.",
    voiceStyle: "Gen-Z",
    petType: "Golden Retriever",
  },
  {
    id: "cat-stare",
    file: "cat-laptop.jpg",
    caption: "You have 30 seconds to explain why you stopped petting me. Choose your words carefully.",
    voiceStyle: "Therapist",
    petType: "House Cat",
  },
  {
    id: "dog-begging",
    file: "dog-begging.jpg",
    caption: "I can smell that you cut the cheese 4.7 seconds ago. The clock is ticking, Karen.",
    voiceStyle: "Narrator",
    petType: "Husky",
  },
  {
    id: "kitten-surprised",
    file: "kitten-surprised.jpg",
    caption: "SOMETHING MOVED UNDER THE BLANKET AND I AM NOT OKAY.",
    voiceStyle: "Shakespeare",
    petType: "Scottish Fold",
  },
];

const OUTPUT_DIR = path.join(__dirname, "..", "public", "samples");

/** Create an SVG overlay with the subtitle bar + branded footer */
function createOverlaySvg(width, height, caption, footerH) {
  // Escape XML special chars in caption
  const escapedCaption = caption
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/—/g, "-")
    .replace(/'/g, "&#39;")
    .replace(/'/g, "&#39;");

  // Calculate font size proportional to width
  const captionFontSize = Math.max(16, Math.round(width * 0.038));
  const brandFontSize = Math.max(14, Math.round(width * 0.024));
  const ctaFontSize = Math.max(12, Math.round(width * 0.020));

  // Gradient bar at bottom of image area (above footer)
  const gradientBarH = Math.round(height * 0.30);
  const gradientBarY = height - footerH - gradientBarH;

  // Text position — centered in the lower portion of the gradient bar
  const textY = height - footerH - Math.round(gradientBarH * 0.25);
  const footerTextY = height - Math.round(footerH * 0.35);
  const padding = Math.round(width * 0.06);

  // Word wrap the caption for SVG (approximate)
  const maxCharsPerLine = Math.floor((width - padding * 2) / (captionFontSize * 0.55));
  const words = escapedCaption.split(" ");
  const lines = [];
  let currentLine = "";
  for (const word of words) {
    if ((currentLine + " " + word).length > maxCharsPerLine && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = currentLine ? currentLine + " " + word : word;
    }
  }
  if (currentLine) lines.push(currentLine);

  // Limit to 3 lines
  const displayLines = lines.slice(0, 3);
  const lineHeight = captionFontSize * 1.35;
  const totalTextH = displayLines.length * lineHeight;
  const firstLineY = textY - totalTextH + lineHeight;

  const captionTspans = displayLines
    .map((line, i) => `<tspan x="${width / 2}" dy="${i === 0 ? 0 : lineHeight}">${line}</tspan>`)
    .join("");

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0" y1="${gradientBarY}" x2="0" y2="${height - footerH}" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="black" stop-opacity="0"/>
      <stop offset="40%" stop-color="black" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="black" stop-opacity="0.75"/>
    </linearGradient>
  </defs>

  <!-- Gradient overlay -->
  <rect x="0" y="${gradientBarY}" width="${width}" height="${gradientBarH}" fill="url(#grad)"/>

  <!-- Caption text with shadow -->
  <text
    x="${width / 2}"
    y="${firstLineY}"
    text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif"
    font-size="${captionFontSize}"
    font-weight="bold"
    fill="white"
    filter="drop-shadow(0 2px 4px rgba(0,0,0,0.8))"
  >${captionTspans}</text>

  <!-- Coral footer -->
  <rect x="0" y="${height - footerH}" width="${width}" height="${footerH}" fill="${CORAL}"/>

  <!-- Footer left: brand -->
  <text
    x="${padding}"
    y="${footerTextY}"
    font-family="Arial, Helvetica, sans-serif"
    font-size="${brandFontSize}"
    font-weight="bold"
    fill="white"
  >🐾 ${BRAND_URL}</text>

  <!-- Footer right: CTA -->
  <text
    x="${width - padding}"
    y="${footerTextY}"
    text-anchor="end"
    font-family="Arial, Helvetica, sans-serif"
    font-size="${ctaFontSize}"
    fill="white"
  >Try it free →</text>
</svg>`;
}

/** Create a small thumbnail version */
function createThumbnailSvg(width, height, caption, footerH) {
  const escapedCaption = caption
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

  const captionFontSize = Math.max(10, Math.round(width * 0.045));
  const gradientBarH = Math.round(height * 0.35);
  const gradientBarY = height - footerH - gradientBarH;
  const textY = height - footerH - Math.round(gradientBarH * 0.20);

  // Truncate caption for thumbnail
  const truncated = escapedCaption.length > 60 ? escapedCaption.slice(0, 57) + "..." : escapedCaption;

  // Simple word wrap
  const maxCharsPerLine = Math.floor((width - 16) / (captionFontSize * 0.55));
  const words = truncated.split(" ");
  const lines = [];
  let currentLine = "";
  for (const word of words) {
    if ((currentLine + " " + word).length > maxCharsPerLine && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = currentLine ? currentLine + " " + word : word;
    }
  }
  if (currentLine) lines.push(currentLine);
  const displayLines = lines.slice(0, 3);
  const lineHeight = captionFontSize * 1.3;
  const totalTextH = displayLines.length * lineHeight;
  const firstLineY = textY - totalTextH + lineHeight;

  const captionTspans = displayLines
    .map((line, i) => `<tspan x="${width / 2}" dy="${i === 0 ? 0 : lineHeight}">${line}</tspan>`)
    .join("");

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0" y1="${gradientBarY}" x2="0" y2="${height - footerH}" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="black" stop-opacity="0"/>
      <stop offset="50%" stop-color="black" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="black" stop-opacity="0.8"/>
    </linearGradient>
  </defs>
  <rect x="0" y="${gradientBarY}" width="${width}" height="${gradientBarH}" fill="url(#grad)"/>
  <text
    x="${width / 2}" y="${firstLineY}"
    text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif"
    font-size="${captionFontSize}" font-weight="bold" fill="white"
    filter="drop-shadow(0 1px 3px rgba(0,0,0,0.9))"
  >${captionTspans}</text>
  <rect x="0" y="${height - footerH}" width="${width}" height="${footerH}" fill="${CORAL}"/>
</svg>`;
}

async function generateSample(sample) {
  const sourcePath = path.join(__dirname, "source-photos", sample.file);

  if (!fs.existsSync(sourcePath)) {
    console.warn(`  ⚠️  Source photo not found: ${sample.file}, skipping`);
    return;
  }

  // === Standard image (carousel) — resize to 600px wide, cap aspect ratio ===
  const stdW = 600;
  const stdH = Math.round(stdW * 0.667); // 3:2 aspect ratio
  const stdFooterH = Math.max(32, Math.round(stdW * 0.06));
  const stdTotalH = stdH + stdFooterH;

  const overlaySvg = createOverlaySvg(stdW, stdTotalH, sample.caption, stdFooterH);

  await sharp(sourcePath)
    .resize(stdW, stdH, { fit: "cover" })
    .extend({ bottom: stdFooterH, background: CORAL })
    .composite([
      {
        input: Buffer.from(overlaySvg),
        top: 0,
        left: 0,
      },
    ])
    .jpeg({ quality: 85 })
    .toFile(path.join(OUTPUT_DIR, `${sample.id}.jpg`));

  console.log(`  ✅ ${sample.id}.jpg (${stdW}x${stdTotalH})`);

  // === Thumbnail (social proof) — 300px wide ===
  const thumbW = 300;
  const thumbH = Math.round(thumbW * 0.667); // 3:2 aspect ratio
  const thumbFooterH = Math.max(16, Math.round(thumbW * 0.05));
  const thumbTotalH = thumbH + thumbFooterH;

  const thumbSvg = createThumbnailSvg(thumbW, thumbTotalH, sample.caption, thumbFooterH);

  await sharp(sourcePath)
    .resize(thumbW, thumbH, { fit: "cover" })
    .extend({ bottom: thumbFooterH, background: CORAL })
    .composite([
      {
        input: Buffer.from(thumbSvg),
        top: 0,
        left: 0,
      },
    ])
    .jpeg({ quality: 80 })
    .toFile(path.join(OUTPUT_DIR, `${sample.id}-thumb.jpg`));

  console.log(`  ✅ ${sample.id}-thumb.jpg (${thumbW}x${thumbTotalH})`);
}

async function main() {
  console.log("🐾 Generating sample images...\n");

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  for (const sample of SAMPLES) {
    await generateSample(sample);
  }

  console.log(`\n✅ Done! ${SAMPLES.length} samples generated in public/samples/`);
}

main().catch(console.error);
