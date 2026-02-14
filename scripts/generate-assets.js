/**
 * Asset generator for What My Pet Thinks
 * Generates placeholder icons and sample images as SVG → PNG via sharp or inline SVGs.
 * Run: node scripts/generate-assets.js
 *
 * If sharp isn't available, generates SVG files instead.
 */

const fs = require("fs");
const path = require("path");

const AMBER = "#F59E0B";
const AMBER_DARK = "#D97706";
const CHARCOAL = "#292524";
const OFF_WHITE = "#FFFBF0";
const TEAL = "#14B8A6";

// Paw print SVG path
const PAW_SVG = `
  <g fill="white" transform="translate(CENTER_X, CENTER_Y) scale(SCALE)">
    <ellipse cx="0" cy="20" rx="28" ry="35"/>
    <ellipse cx="-30" cy="-20" rx="14" ry="18" transform="rotate(-10 -30 -20)"/>
    <ellipse cx="-10" cy="-35" rx="13" ry="17"/>
    <ellipse cx="15" cy="-35" rx="13" ry="17"/>
    <ellipse cx="35" cy="-18" rx="14" ry="18" transform="rotate(10 35 -18)"/>
  </g>
`;

function makePawSvg(cx, cy, scale) {
  return PAW_SVG.replace("CENTER_X", cx).replace("CENTER_Y", cy).replace("SCALE", scale);
}

function generateIconSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${AMBER};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${AMBER_DARK};stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="url(#bg)"/>
  ${makePawSvg(size / 2, size / 2 + 5, size / 130)}
</svg>`;
}

function generateOgImage() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${AMBER};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${AMBER_DARK};stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  ${makePawSvg(200, 315, 1.5)}
  <text x="320" y="280" font-family="sans-serif" font-weight="700" font-size="72" fill="white">What My Pet Thinks</text>
  <text x="320" y="350" font-family="sans-serif" font-weight="400" font-size="32" fill="white" opacity="0.9">Find out what your pet is really thinking</text>
  <text x="320" y="420" font-family="sans-serif" font-weight="400" font-size="24" fill="white" opacity="0.7">AI-powered pet thought translation</text>
</svg>`;
}

function generateSampleSvg(index, caption) {
  const colors = [
    { bg: "#8B5CF6", accent: "#A78BFA" },
    { bg: "#EC4899", accent: "#F472B6" },
    { bg: "#3B82F6", accent: "#60A5FA" },
  ];
  const animals = ["🐕", "🐈", "🐹"];
  const { bg, accent } = colors[index];
  const animal = animals[index];

  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500">
  <rect width="400" height="500" fill="${bg}"/>

  <!-- Pet silhouette area -->
  <rect x="40" y="40" width="320" height="300" rx="16" fill="${accent}" opacity="0.3"/>
  <text x="200" y="220" font-size="120" text-anchor="middle" dominant-baseline="middle">${animal}</text>

  <!-- Subtitle bar -->
  <rect x="0" y="340" width="400" height="110" fill="rgba(0,0,0,0.7)"/>
  <text x="200" y="380" font-family="sans-serif" font-weight="700" font-size="18" fill="white" text-anchor="middle">${caption}</text>

  <!-- Branded footer -->
  <rect x="0" y="450" width="400" height="50" fill="${AMBER}"/>
  <text x="20" y="482" font-family="sans-serif" font-weight="700" font-size="16" fill="white">🐾 whatmypetthinks.com</text>
  <text x="380" y="482" font-family="sans-serif" font-size="14" fill="white" text-anchor="end">whatmypetthinks.com</text>
</svg>`;
}

// Write files
const publicDir = path.join(__dirname, "..", "public");

const files = [
  { path: path.join(publicDir, "icons", "icon-192.svg"), content: generateIconSvg(192) },
  { path: path.join(publicDir, "icons", "icon-512.svg"), content: generateIconSvg(512) },
  { path: path.join(publicDir, "og-image.svg"), content: generateOgImage() },
  {
    path: path.join(publicDir, "samples", "sample-1.svg"),
    content: generateSampleSvg(0, "I have been a good boy for 47 seconds. Where is my treat."),
  },
  {
    path: path.join(publicDir, "samples", "sample-2.svg"),
    content: generateSampleSvg(1, "You call this dinner? I have seen better food in the trash."),
  },
  {
    path: path.join(publicDir, "samples", "sample-3.svg"),
    content: generateSampleSvg(2, "I am NOT hiding. This is my surveillance position."),
  },
];

for (const file of files) {
  fs.mkdirSync(path.dirname(file.path), { recursive: true });
  fs.writeFileSync(file.path, file.content);
  console.log(`✓ Generated ${path.relative(path.join(__dirname, ".."), file.path)}`);
}

console.log("\nDone! SVG assets generated.");
console.log("Note: For PNG versions (needed for PWA icons), convert SVGs using any online tool or sharp.");
