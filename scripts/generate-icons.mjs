// Generates the FRICK logo icons from one inline SVG:
//   public/icons/*.png  PWA and Apple touch icons (dark square background)
//   public/icons/icon.svg favicon for modern browsers (transparent outside the frame)
//   src/app/favicon.ico favicon fallback, 16/32/48 px
// Run with: npm run icons
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

// Same values as the tokens in src/app/globals.css (abyss, deep, gold-*, hextech-*). Keep them in sync.
const ABYSS = "#010a13";
const DEEP = "#0a1428";
const GOLD = { 100: "#f0e6d2", 200: "#e2cf9f", 300: "#c8aa6e", 500: "#785a28" };
const HEXTECH = { 100: "#cdfafa", 300: "#0ac8b9", 700: "#005a82" };

/**
 * The FRICK logo in a 64x64 box: a gold Hextech frame with cut corners, a blade-like gold "F" and a teal
 * hextech gem under its arm.
 * @param {{ background: boolean, scale?: number }} options background: fill the square behind the frame;
 *   scale: shrink the logo around the center (maskable icons must keep it inside the 80% safe zone).
 */
function logoSvg({ background, scale = 1 }) {
  const shift = (64 * (1 - scale)) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${GOLD[100]}"/><stop offset="0.45" stop-color="${GOLD[300]}"/><stop offset="1" stop-color="${GOLD[500]}"/>
    </linearGradient>
    <linearGradient id="frame" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${GOLD[200]}"/><stop offset="1" stop-color="${GOLD[500]}"/>
    </linearGradient>
    <linearGradient id="gem" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${HEXTECH[100]}"/><stop offset="0.5" stop-color="${HEXTECH[300]}"/><stop offset="1" stop-color="${HEXTECH[700]}"/>
    </linearGradient>
  </defs>
  ${background ? `<rect width="64" height="64" fill="${ABYSS}"/>` : ""}
  <g transform="translate(${shift} ${shift}) scale(${scale})">
    <polygon points="10,2 54,2 62,10 62,54 54,62 10,62 2,54 2,10" fill="url(#frame)"/>
    <polygon points="11.5,5 52.5,5 59,11.5 59,52.5 52.5,59 11.5,59 5,52.5 5,11.5" fill="${DEEP}"/>
    <polygon points="19,13 47,13 43,21 28,21 28,29 41,29 37.5,36 28,36 28,46 23.5,52 19,46" fill="url(#gold)"/>
    <polygon points="44,37 49.5,43.5 44,50 38.5,43.5" fill="url(#gem)"/>
  </g>
</svg>
`;
}

/** PNG of an SVG at `size` px. */
function png(svg, size) {
  return sharp(Buffer.from(svg), { density: (72 * size) / 64 }).resize(size, size).png().toBuffer();
}

/** An .ico file holding PNG images (supported by every current browser). */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);
  const entries = Buffer.alloc(16 * images.length);
  let offset = header.length + entries.length;
  images.forEach(({ size, data }, i) => {
    const at = i * 16;
    entries.writeUInt8(size >= 256 ? 0 : size, at);
    entries.writeUInt8(size >= 256 ? 0 : size, at + 1);
    entries.writeUInt16LE(1, at + 4); // color planes
    entries.writeUInt16LE(32, at + 6); // bits per pixel
    entries.writeUInt32LE(data.length, at + 8);
    entries.writeUInt32LE(offset, at + 12);
    offset += data.length;
  });
  return Buffer.concat([header, entries, ...images.map((image) => image.data)]);
}

const square = logoSvg({ background: true });
const icons = [
  { file: "public/icons/icon-192.png", size: 192, svg: square },
  { file: "public/icons/icon-512.png", size: 512, svg: square },
  // Maskable icons get cropped to a circle; keep the logo inside the 80% safe zone.
  { file: "public/icons/icon-maskable-512.png", size: 512, svg: logoSvg({ background: true, scale: 0.8 }) },
  { file: "public/icons/apple-touch-icon.png", size: 180, svg: square },
];

for (const { file, size, svg } of icons) {
  await writeFile(path.join(root, file), await png(svg, size));
  console.log(`Generated ${file}`);
}

const favicon = logoSvg({ background: false });
await writeFile(path.join(root, "public/icons/icon.svg"), favicon);
console.log("Generated public/icons/icon.svg");

const sizes = [16, 32, 48];
await writeFile(
  path.join(root, "src/app/favicon.ico"),
  ico(await Promise.all(sizes.map(async (size) => ({ size, data: await png(favicon, size) })))),
);
console.log("Generated src/app/favicon.ico");
