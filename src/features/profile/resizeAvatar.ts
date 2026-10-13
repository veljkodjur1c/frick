// Browser only: uses <img> and <canvas>.

const AVATAR_SIZE = 256;
const QUALITY = 0.85;

function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.src = url;
  // <img> applies the photo's EXIF rotation, so phone photos come out upright.
  return image
    .decode()
    .then(() => image)
    .finally(() => URL.revokeObjectURL(url));
}

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

/**
 * Center-crops a picked photo to a 256x256 square and encodes it as WebP.
 * Throws if the browser can't read the file (e.g. not an image).
 */
export async function resizeAvatar(file: File): Promise<Blob> {
  const image = await loadImage(file);
  const side = Math.min(image.naturalWidth, image.naturalHeight);
  if (side === 0) {
    throw new Error("Image has no size");
  }

  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas is not supported");
  }
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    (image.naturalWidth - side) / 2,
    (image.naturalHeight - side) / 2,
    side,
    side,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE,
  );

  const webp = await toBlob(canvas, "image/webp");
  if (webp?.type === "image/webp") {
    return webp;
  }
  // Browsers that can't encode WebP (older Safari) silently return PNG instead; JPEG is much smaller.
  const jpeg = await toBlob(canvas, "image/jpeg");
  if (!jpeg) {
    throw new Error("Could not encode image");
  }
  return jpeg;
}
