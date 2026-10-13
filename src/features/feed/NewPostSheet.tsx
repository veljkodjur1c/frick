"use client";

import { useRef, useState, useTransition } from "react";
import { Button, Sheet, Textarea } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { createPost } from "./actions";
import { CAPTION_MAX_LENGTH, MAX_UPLOAD_BYTES, POST_IMAGES_BUCKET } from "./constants";
import { resizeImage } from "@/lib/resizeImage";

/** "Nova objava" button and the sheet for picking a photo and writing a caption. */
export function NewPostSheet({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  function pickFile(next: File | null) {
    // accept="image/*" is only a hint; desktop pickers still let you choose any file.
    if (next && !next.type.startsWith("image/")) {
      setError("Možeš da objaviš samo sliku.");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(next);
    setPreviewUrl(next ? URL.createObjectURL(next) : null);
    setError(null);
  }

  function reset() {
    pickFile(null);
    setCaption("");
  }

  function submit() {
    if (!file) return;
    setError(null);

    startTransition(async () => {
      let image: Blob;
      try {
        image = await resizeImage(file);
      } catch {
        setError("Ova slika ne može da se otvori. Probaj neku drugu.");
        return;
      }
      if (image.size > MAX_UPLOAD_BYTES) {
        setError("Slika je prevelika i posle smanjivanja (najviše 5 MB). Probaj neku drugu.");
        return;
      }

      // Not crypto.randomUUID(): it's missing on plain http, e.g. testing on a phone over LAN.
      const path = `${userId}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}.jpg`;
      const storage = createClient().storage.from(POST_IMAGES_BUCKET);

      const { error: uploadError } = await storage.upload(path, image, { contentType: "image/jpeg" });
      if (uploadError) {
        setError("Slika nije otpremljena. Proveri internet i pokušaj ponovo.");
        return;
      }

      const message = await createPost({ imagePath: path, caption });
      if (message) {
        // Don't leave a photo in Storage that no post points to.
        await storage.remove([path]);
        setError(message);
        return;
      }

      reset();
      setOpen(false);
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Nova objava</Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Nova objava"
        footer={
          <Button size="lg" fullWidth loading={pending} disabled={!file} onClick={submit}>
            Objavi
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              pickFile(event.target.files?.[0] ?? null);
              // Clear it so picking the same file again still fires onChange.
              event.target.value = "";
            }}
          />

          {previewUrl ? (
            <div className="flex flex-col gap-2">
              {/* Local blob preview, next/image can't optimize it. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Izabrana slika" className="aspect-4/5 w-full rounded-lg object-cover" />
              <Button variant="ghost" disabled={pending} onClick={() => fileInput.current?.click()}>
                Promeni sliku
              </Button>
            </div>
          ) : (
            <Button variant="secondary" size="lg" fullWidth onClick={() => fileInput.current?.click()}>
              Izaberi sliku
            </Button>
          )}

          <Textarea
            label="Opis"
            hint="Nije obavezno"
            value={caption}
            maxLength={CAPTION_MAX_LENGTH}
            disabled={pending}
            onChange={(event) => setCaption(event.target.value)}
          />

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </div>
      </Sheet>
    </>
  );
}
