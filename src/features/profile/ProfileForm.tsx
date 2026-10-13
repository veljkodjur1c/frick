"use client";

import { useEffect, useRef, useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { Avatar, Button, Input, RankBadge, Sheet } from "@/components/ui";
import { CameraIcon } from "@/features/tasks/TaskRow";
import { rankFromLp } from "@/lib/game/rank";
import { createClient } from "@/lib/supabase/client";
import { updateProfile } from "./actions";
import { DISPLAY_NAME_MAX, displayNameError } from "./displayName";
import { resizeAvatar } from "./resizeAvatar";

type ProfileFormProps = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  lp: number;
};

// The public bucket from supabase/migrations/*_avatars_storage.sql.
const AVATAR_BUCKET = "avatars";

/**
 * Top of /profile: the picture (tap it to pick a new one, saved from a sheet), the name and the rank.
 * "Izmeni profil" opens the name field under it.
 */
export function ProfileForm({ userId, displayName, avatarUrl, lp }: ProfileFormProps) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <AvatarPicker userId={userId} displayName={displayName} avatarUrl={avatarUrl} />
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="truncate text-xl font-semibold text-fg">{displayName}</p>
          <RankBadge {...rankFromLp(lp)} />
        </div>
      </div>

      {editing ? (
        <NameForm displayName={displayName} onDone={() => setEditing(false)} />
      ) : (
        <Button variant="secondary" fullWidth onClick={() => setEditing(true)}>
          Izmeni profil
        </Button>
      )}
    </div>
  );
}

/** The name field with Otkaži / Sačuvaj. Closes itself after a save. */
function NameForm({ displayName, onDone }: { displayName: string; onDone: () => void }) {
  const [name, setName] = useState(displayName);
  const [errors, setErrors] = useState<{ displayName?: string; form?: string }>({});
  const [pending, startTransition] = useTransition();
  const trimmedName = name.trim();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nameError = displayNameError(trimmedName);
    if (nameError) {
      setErrors({ displayName: nameError });
      return;
    }

    startTransition(async () => {
      try {
        const result = await updateProfile({ displayName: trimmedName });
        if (!result.ok) {
          setErrors({ displayName: result.fieldErrors?.displayName, form: result.formError });
          return;
        }
        onDone();
      } catch (error) {
        console.error("Saving the name failed", error);
        setErrors({ form: "Ime nije sačuvano. Probaj ponovo." });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
      <Input
        label="Ime u igri"
        name="displayName"
        autoComplete="nickname"
        autoFocus
        maxLength={DISPLAY_NAME_MAX}
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={errors.displayName}
      />
      {errors.form && (
        <p role="alert" className="text-sm text-danger">
          {errors.form}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="ghost" disabled={pending} onClick={onDone}>
          Otkaži
        </Button>
        <Button type="submit" loading={pending} disabled={trimmedName === displayName}>
          Sačuvaj ime
        </Button>
      </div>
    </form>
  );
}

/** The avatar as a button: picks a photo, shows it in a sheet and uploads it on "Sačuvaj sliku". */
function AvatarPicker({ userId, displayName, avatarUrl }: Omit<ProfileFormProps, "lp">) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<{ blob: Blob; previewUrl: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Free the preview's memory when it is replaced or the picker goes away.
  useEffect(() => {
    if (!picked) return;
    return () => URL.revokeObjectURL(picked.previewUrl);
  }, [picked]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Allow picking the same file again after an error.
    event.target.value = "";
    if (!file) return;

    setPreparing(true);
    setError(null);
    try {
      const blob = await resizeAvatar(file);
      setPicked({ blob, previewUrl: URL.createObjectURL(blob) });
    } catch {
      setPicked(null);
      setError("Ova slika ne može da se otvori. Izaberi drugu.");
    } finally {
      setPreparing(false);
      setOpen(true);
    }
  }

  function close() {
    if (pending) return;
    setOpen(false);
    setPicked(null);
    setError(null);
  }

  function save() {
    if (!picked) return;
    setError(null);
    startTransition(async () => {
      try {
        const avatarPath = `${userId}/avatar.webp`;
        const { error: uploadError } = await createClient()
          .storage.from(AVATAR_BUCKET)
          .upload(avatarPath, picked.blob, { upsert: true, contentType: picked.blob.type });
        if (uploadError) {
          console.error("Avatar upload failed", uploadError);
          setError("Slika nije poslata. Proveri internet pa probaj ponovo.");
          return;
        }

        const result = await updateProfile({ displayName, avatarPath });
        if (!result.ok) {
          setError(result.fieldErrors?.avatar ?? result.formError ?? "Slika nije sačuvana. Probaj ponovo.");
          return;
        }
        setOpen(false);
        setPicked(null);
      } catch (saveError) {
        console.error("Saving the avatar failed", saveError);
        setError("Slika nije sačuvana. Probaj ponovo.");
      }
    });
  }

  return (
    <>
      {/* The avatar itself is the tap target; the camera badge shows that it can be changed. */}
      <button
        type="button"
        aria-label="Promeni sliku"
        aria-busy={preparing || undefined}
        disabled={preparing}
        onClick={() => fileInput.current?.click()}
        className="relative shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hextech-300"
      >
        <Avatar name={displayName} src={avatarUrl} size="xl" />
        <span
          aria-hidden
          className="absolute -right-0.5 -bottom-0.5 flex size-8 items-center justify-center rounded-full border border-line bg-deep text-gold-200"
        >
          <CameraIcon className="size-4" />
        </span>
      </button>
      <input ref={fileInput} type="file" accept="image/*" hidden onChange={handleFileChange} />

      <Sheet
        open={open}
        onClose={close}
        title="Nova slika"
        footer={
          <div className="flex flex-col gap-2">
            <Button size="lg" fullWidth loading={pending} disabled={!picked} onClick={save}>
              Sačuvaj sliku
            </Button>
            <Button variant="ghost" fullWidth disabled={pending} onClick={() => fileInput.current?.click()}>
              Izaberi drugu
            </Button>
          </div>
        }
      >
        <div className="flex flex-col items-center gap-4">
          {picked && (
            // Local blob preview, next/image can't optimize it.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={picked.previewUrl}
              alt="Izabrana slika"
              className="size-48 rounded-full object-cover ring-1 ring-line"
            />
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
