"use client";

import { useEffect, useRef, useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { Avatar, Button, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { updateProfile } from "./actions";
import { DISPLAY_NAME_MAX, displayNameError } from "./displayName";
import { resizeAvatar } from "./resizeAvatar";

type ProfileFormProps = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
};

type Errors = { displayName?: string; avatar?: string; form?: string };

// The public bucket from supabase/migrations/*_avatars_storage.sql.
const AVATAR_BUCKET = "avatars";

export function ProfileForm({ userId, displayName: savedName, avatarUrl }: ProfileFormProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(savedName);
  const [avatar, setAvatar] = useState<{ blob: Blob; previewUrl: string } | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [saved, setSaved] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [pending, startTransition] = useTransition();

  // Free the preview's memory when it is replaced or the form goes away.
  useEffect(() => {
    if (!avatar) return;
    return () => URL.revokeObjectURL(avatar.previewUrl);
  }, [avatar]);

  const trimmedName = name.trim();
  const dirty = trimmedName !== savedName || avatar !== null;

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Allow picking the same file again after an error.
    event.target.value = "";
    if (!file) return;

    setPreparing(true);
    setSaved(false);
    try {
      const blob = await resizeAvatar(file);
      setAvatar({ blob, previewUrl: URL.createObjectURL(blob) });
      setErrors((current) => ({ ...current, avatar: undefined }));
    } catch {
      setErrors((current) => ({ ...current, avatar: "Ova slika ne može da se otvori. Izaberi drugu." }));
    } finally {
      setPreparing(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);

    const nameError = displayNameError(trimmedName);
    if (nameError) {
      setErrors({ displayName: nameError });
      return;
    }

    startTransition(async () => {
      try {
        let avatarPath: string | undefined;
        if (avatar) {
          avatarPath = `${userId}/avatar.webp`;
          const supabase = createClient();
          const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(avatarPath, avatar.blob, {
            upsert: true,
            contentType: avatar.blob.type,
          });
          if (error) {
            console.error("Avatar upload failed", error);
            setErrors({ avatar: "Slika nije poslata. Proveri internet pa probaj ponovo." });
            return;
          }
        }

        const result = await updateProfile({ displayName: trimmedName, avatarPath });
        if (!result.ok) {
          setErrors({ ...result.fieldErrors, form: result.formError });
          return;
        }
        setErrors({});
        setAvatar(null);
        setName(trimmedName);
        setSaved(true);
      } catch (error) {
        console.error("Saving profile failed", error);
        setErrors({ form: "Profil nije sačuvan. Probaj ponovo." });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <Avatar name={trimmedName || savedName} src={avatar?.previewUrl ?? avatarUrl} size="xl" />
        <div className="flex min-w-0 flex-col items-start gap-1">
          <Button
            variant="secondary"
            size="sm"
            loading={preparing}
            disabled={pending}
            onClick={() => fileInput.current?.click()}
          >
            Promeni sliku
          </Button>
          {errors.avatar ? (
            <p role="alert" className="text-sm text-danger">
              {errors.avatar}
            </p>
          ) : (
            avatar && <p className="text-sm text-fg-muted">Nova slika se čuva kad klikneš Sačuvaj.</p>
          )}
        </div>
        <input ref={fileInput} type="file" accept="image/*" hidden onChange={handleFileChange} />
      </div>

      <Input
        label="Ime u igri"
        name="displayName"
        autoComplete="nickname"
        maxLength={DISPLAY_NAME_MAX}
        value={name}
        onChange={(event) => {
          setName(event.target.value);
          setSaved(false);
        }}
        error={errors.displayName}
      />

      {errors.form && (
        <p role="alert" className="text-sm text-danger">
          {errors.form}
        </p>
      )}
      {saved && (
        <p role="status" className="text-sm text-success">
          Profil je sačuvan.
        </p>
      )}

      <Button type="submit" variant="primary" fullWidth loading={pending} disabled={!dirty || preparing}>
        Sačuvaj
      </Button>
    </form>
  );
}
