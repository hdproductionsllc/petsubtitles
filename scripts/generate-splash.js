const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const outputDir = path.join(__dirname, "..", "public", "splash");
fs.mkdirSync(outputDir, { recursive: true });

// iOS device splash screen sizes
const sizes = [
  { name: "iphone-se", w: 640, h: 1136 },
  { name: "iphone-8", w: 750, h: 1334 },
  { name: "iphone-8-plus", w: 1242, h: 2208 },
  { name: "iphone-x", w: 1125, h: 2436 },
  { name: "iphone-xr", w: 828, h: 1792 },
  { name: "iphone-xsmax", w: 1242, h: 2688 },
  { name: "iphone-12", w: 1170, h: 2532 },
  { name: "iphone-12-max", w: 1284, h: 2778 },
  { name: "iphone-14-pro", w: 1179, h: 2556 },
  { name: "iphone-14-promax", w: 1290, h: 2796 },
  { name: "iphone-15-pro", w: 1179, h: 2556 },
  { name: "ipad", w: 1536, h: 2048 },
  { name: "ipad-pro-11", w: 1668, h: 2388 },
  { name: "ipad-pro-13", w: 2048, h: 2732 },
];

async function generateSplash(name, w, h) {
  const logoSize = Math.round(Math.min(w, h) * 0.15);
  const fontSize = Math.round(logoSize * 0.6);
  const subFontSize = Math.round(fontSize * 0.45);

  const svg = `
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#FF6B4A"/>
          <stop offset="100%" stop-color="#E0452A"/>
        </linearGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="url(#bg)"/>
      <text x="${w/2}" y="${h/2 - subFontSize}" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold" font-size="${fontSize}">🐾 What My Pet Thinks</text>
      <text x="${w/2}" y="${h/2 + subFontSize * 1.5}" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="Arial, sans-serif" font-size="${subFontSize}">Your pet has opinions.</text>
    </svg>
  `;

  const outputPath = path.join(outputDir, `${name}.png`);
  await sharp(Buffer.from(svg)).png().toFile(outputPath);
  console.log(`✓ splash/${name}.png (${w}x${h})`);
}

async function main() {
  for (const { name, w, h } of sizes) {
    await generateSplash(name, w, h);
  }
  console.log("\nAll splash screens generated!");
}

main().catch(console.error);
