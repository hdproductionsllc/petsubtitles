/**
 * Generate a proper OG image (1200x630) for social sharing previews.
 * Uses one of our sample pet photos with branded overlay.
 *
 * Usage: node scripts/generate-og.js
 */

const sharp = require("sharp");
const path = require("path");

const CORAL = "#FF6B4A";
const W = 1200;
const H = 630;

async function main() {
  const sourcePath = path.join(__dirname, "source-photos", "golden-retriever.jpg");
  const outputPath = path.join(__dirname, "..", "public", "og-image.png");

  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="overlay" x1="0" y1="0" x2="0" y2="${H}" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="black" stop-opacity="0.1"/>
      <stop offset="50%" stop-color="black" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="black" stop-opacity="0.7"/>
    </linearGradient>
  </defs>

  <!-- Dark overlay for text legibility -->
  <rect width="${W}" height="${H}" fill="url(#overlay)"/>

  <!-- Top left: logo -->
  <text x="50" y="65" font-family="Arial, Helvetica, sans-serif" font-size="32" font-weight="bold" fill="white" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))">What My Pet Thinks</text>

  <!-- Center: headline -->
  <text x="${W / 2}" y="${H / 2 - 20}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="bold" fill="white" filter="drop-shadow(0 3px 6px rgba(0,0,0,0.6))">What Is Your Pet</text>
  <text x="${W / 2}" y="${H / 2 + 45}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="bold" fill="${CORAL}" filter="drop-shadow(0 3px 6px rgba(0,0,0,0.6))">REALLY Thinking?</text>

  <!-- Coral footer bar -->
  <rect x="0" y="${H - 60}" width="${W}" height="60" fill="${CORAL}"/>
  <text x="50" y="${H - 22}" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="bold" fill="white">whatmypetthinks.com</text>
  <text x="${W - 50}" y="${H - 22}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="white">AI Pet Thought Translation - Try It Free</text>
</svg>`;

  await sharp(sourcePath)
    .resize(W, H, { fit: "cover", position: "center" })
    .composite([
      {
        input: Buffer.from(svg),
        top: 0,
        left: 0,
      },
    ])
    .png({ quality: 90 })
    .toFile(outputPath);

  console.log(`✅ OG image generated: ${outputPath} (${W}x${H})`);
}

main().catch(console.error);
