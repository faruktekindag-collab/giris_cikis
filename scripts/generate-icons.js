// Run with: node scripts/generate-icons.js
// Generates PWA icons from SVG template

const fs = require("fs");
const path = require("path");

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, "..", "public", "icons");

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate a simple SVG icon for each size
// We use a canvas-free approach: create SVG and convert via sharp if available,
// otherwise just create SVG files that browsers can use

function createSVG(size) {
  const padding = Math.round(size * 0.15);
  const innerSize = size - padding * 2;
  const fontSize = Math.round(size * 0.28);
  const subFontSize = Math.round(size * 0.1);
  const radius = Math.round(size * 0.18);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="#1E3A5F"/>
  <rect x="${padding}" y="${padding}" width="${innerSize}" height="${innerSize}" rx="${Math.round(radius * 0.6)}" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="${Math.max(1, Math.round(size * 0.01))}"/>
  <text x="${size / 2}" y="${size * 0.42}" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="${fontSize}" fill="white">FCT</text>
  <line x1="${padding + innerSize * 0.15}" y1="${size * 0.52}" x2="${padding + innerSize * 0.85}" y2="${size * 0.52}" stroke="rgba(255,255,255,0.3)" stroke-width="${Math.max(1, Math.round(size * 0.008))}"/>
  <text x="${size / 2}" y="${size * 0.68}" text-anchor="middle" font-family="Arial,sans-serif" font-weight="600" font-size="${subFontSize}" fill="rgba(255,255,255,0.85)">IN/OUT</text>
  <circle cx="${size * 0.78}" cy="${size * 0.22}" r="${Math.round(size * 0.06)}" fill="#22C55E"/>
</svg>`;
}

// Try to use sharp for PNG conversion, fallback to SVG
let sharp;
try {
  sharp = require("sharp");
} catch {
  sharp = null;
}

async function generate() {
  for (const size of sizes) {
    const svg = createSVG(size);
    const svgPath = path.join(iconsDir, `icon-${size}x${size}.svg`);
    const pngPath = path.join(iconsDir, `icon-${size}x${size}.png`);

    if (sharp) {
      // Convert SVG to PNG using sharp
      await sharp(Buffer.from(svg)).png().toFile(pngPath);
      console.log(`Created ${pngPath}`);
    } else {
      // Save as SVG (browsers support SVG icons too)
      fs.writeFileSync(svgPath, svg);
      // Also create a minimal 1x1 PNG placeholder
      // (We'll update manifest to use SVG)
      fs.writeFileSync(pngPath, createMinimalPNG(size));
      console.log(`Created ${svgPath} + placeholder ${pngPath}`);
    }
  }

  // Create favicon.svg
  const faviconSvg = createSVG(32);
  fs.writeFileSync(path.join(iconsDir, "..", "favicon.svg"), faviconSvg);
  console.log("Created favicon.svg");

  // Create apple-touch-icon
  if (sharp) {
    const appleSvg = createSVG(180);
    await sharp(Buffer.from(appleSvg)).png().toFile(path.join(iconsDir, "..", "apple-touch-icon.png"));
    console.log("Created apple-touch-icon.png");
  }
}

function createMinimalPNG(size) {
  // Create actual PNG using canvas-like approach with raw bytes
  // This creates a valid PNG with the FCT branding color
  const { createPNG } = require("./png-helper");
  if (typeof createPNG === "function") return createPNG(size);

  // Fallback: copy SVG content as-is (browsers handle it)
  return Buffer.from(createSVG(size));
}

generate().catch(console.error);
