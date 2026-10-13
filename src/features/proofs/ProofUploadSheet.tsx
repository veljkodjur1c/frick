"use client";

import { useRef, useState, useTransition } from "react";
import { Badge, Button, Sheet } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import { PROOF_APPROVALS_NEEDED } from "@/lib/game/config";
import { resizeImage } from "@/lib/resizeImage";
import { createClient } from "@/lib/supabase/client";
import { submitProof } from "./actions";
import { MAX_PROOF_BYTES, PROOF_IMAGES_BUCKET } from "./constants";

type ProofUploadSheetProps = {
  taskId: string;
  taskTitle: string;
  points: number;
  /** The last proof got Capped, so this is a second try. */
  retry?: boolean;
};

/** "Pošalji dokaz" button on a proof task and the sheet for picking the photo. */
export function ProofUploadSheet({ taskId, taskTitle, points, retry = false }: ProofUploadSheetProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  function pickFile(next: File | null) {
    // accept="image/*" is only a hint; desktop pickers still let you choose any file.
    if (next && !next.type.startsWith("image/")) {
      setError("Dokaz mora da bude slika.");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(next);
    setPreviewUrl(next ? URL.createObjectURL(next) : null);
    setError(null);
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
      if (image.size > MAX_PROOF_BYTES) {
        setError("Slika je prevelika i posle smanjivanja (najviše 5 MB). Probaj neku drugu.");
        return;
      }

      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setError("Prijavi se ponovo pa pokušaj još jednom.");
        return;
      }

      // Not crypto.randomUUID(): it's missing on plain http, e.g. testing on a phone over LAN.
      const path = `${data.user.id}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}.jpg`;
      const storage = supabase.storage.from(PROOF_IMAGES_BUCKET);

      const { error: uploadError } = await storage.upload(path, image, { contentType: "image/jpeg" });
      if (uploadError) {
        setError("Slika nije otpremljena. Proveri internet i pokušaj ponovo.");
        return;
      }

      const result = await submitProof(taskId, path);
      if (!result.ok) {
        // Don't leave a photo in Storage that no completion points to.
        await storage.remove([path]);
        setError(result.error);
        return;
      }

      pickFile(null);
      setOpen(false);
    });
  }

  return (
    <>
      <Button variant="secondary" className="mt-2" onClick={() => setOpen(true)}>
        {retry ? "Pošalji novi dokaz" : "Pošalji dokaz"}
      </Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Dokaz"
        footer={
          <Button size="lg" fullWidth loading={pending} disabled={!file} onClick={submit}>
            Pošalji dokaz
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-fg">{taskTitle}</p>
              <p className="mt-1 text-sm text-fg-muted">
                Ostali glasaju Legit ili Cap. Sa {formatNumber(PROOF_APPROVALS_NEEDED)} Legit glasa task je priznat.
              </p>
            </div>
            <Badge tone="gold">+{formatNumber(points)}</Badge>
          </div>

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
