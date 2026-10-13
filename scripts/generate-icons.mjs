// Generates placeholder PWA icons into public/icons/ from an inline SVG.
// Run with: npm run icons
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const BACKGROUND = "#010a13";
const FOREGROUND = "#c8aa6e";

const outDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "icons",
);

// Letter "F" (FRICK) drawn as a polygon in an 80x100 box, so the output does not depend on installed fonts.
// Shifted right a little so it looks centered (an F has nothing under its arms).
const F_POINTS = [
  [8, 0], [80, 0], [80, 20], [30, 20], [30, 41],
  [70, 41], [70, 60], [30, 60], [30, 100], [8, 100],
];

/** @param {number} letterRatio letter height as a fraction of the icon size */
function iconSvg(letterRatio) {
  const size = 100;
  const scale = (size * letterRatio) / 100;
  const offsetX = (size - 80 * scale) / 2;
  const offsetY = (size - 100 * scale) / 2;
  const points = F_POINTS.map(
    ([x, y]) => `${offsetX + x * scale},${offsetY + y * scale}`,
  ).join(" ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BACKGROUND}"/>
  <polygon points="${points}" fill="${FOREGROUND}"/>
</svg>`;
}

const icons = [
  { file: "icon-192.png", size: 192, letterRatio: 0.56 },
  { file: "icon-512.png", size: 512, letterRatio: 0.56 },
  // Maskable icons get cropped to a circle; keep the letter inside the 80% safe zone.
  { file: "icon-maskable-512.png", size: 512, letterRatio: 0.42 },
  { file: "apple-touch-icon.png", size: 180, letterRatio: 0.52 },
];

await mkdir(outDir, { recursive: true });

for (const { file, size, letterRatio } of icons) {
  await sharp(Buffer.from(iconSvg(letterRatio)), { density: 72 * (size / 100) })
    .resize(size, size)
    .flatten({ background: BACKGROUND })
    .png()
    .toFile(path.join(outDir, file));
  console.log(`Generated public/icons/${file}`);
}
