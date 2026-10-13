// Phone photos are often 4-12 MB. Shrinking them in the browser makes uploads fast on mobile data
// and keeps Storage small. 1600px is plenty for a 448px wide column on a 3x screen.
const MAX_SIDE = 1600;
const JPEG_QUALITY = 0.8;

/** Scales a photo down so its longest side is at most MAX_SIDE and re-encodes it as JPEG. */
export async function resizeImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D is not supported");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode image"))),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}
