"use server";

import type { AuthError } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { displayNameError } from "@/features/profile/displayName";
import { safeNextPath } from "@/lib/redirect";
import { createClient } from "@/lib/supabase/server";
import { PASSWORD_MIN } from "./password";

export type AuthField = "email" | "password" | "displayName";

export type AuthFormState = {
  /** Errors shown under a field. */
  fieldErrors?: Partial<Record<AuthField, string>>;
  /** Error that doesn't belong to one field (network, rate limit). */
  formError?: string;
  /** What the user typed, so the form isn't emptied after an error. Never the password. */
  values?: { email: string; displayName: string };
};

const HOME_PATH = "/feed";
// Rough shape check only; Supabase does the real validation.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

// Map Supabase Auth errors to Serbian messages. Unknown errors get a generic message, never the raw English one.
function authErrorState(error: AuthError): Pick<AuthFormState, "fieldErrors" | "formError"> {
  switch (error.code) {
    case "invalid_credentials":
      return { fieldErrors: { password: "Pogrešan mejl ili lozinka." } };
    case "user_already_exists":
    case "email_exists":
      return { fieldErrors: { email: "Nalog sa ovim mejlom već postoji. Prijavi se." } };
    case "email_address_invalid":
      return { fieldErrors: { email: "Unesi ispravan mejl." } };
    case "weak_password":
      return { fieldErrors: { password: `Lozinka mora imati bar ${PASSWORD_MIN} znakova.` } };
    case "signup_disabled":
      return { formError: "Registracija je zatvorena. Javi se ekipi za nalog." };
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return { formError: "Previše pokušaja. Sačekaj malo pa probaj ponovo." };
    default:
      console.error("Supabase auth error", error);
      return { formError: "Nešto nije u redu. Probaj ponovo." };
  }
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = text(formData, "email").trim();
  const password = text(formData, "password");
  const values = { email, displayName: "" };

  const fieldErrors: AuthFormState["fieldErrors"] = {};
  if (!email) fieldErrors.email = "Unesi mejl.";
  if (!password) fieldErrors.password = "Unesi lozinku.";
  if (fieldErrors.email || fieldErrors.password) {
    return { fieldErrors, values };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { ...authErrorState(error), values };
  }

  redirect(safeNextPath(formData.get("next")) ?? HOME_PATH);
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = text(formData, "email").trim();
  const password = text(formData, "password");
  const displayName = text(formData, "displayName").trim();
  const values = { email, displayName };

  const fieldErrors: AuthFormState["fieldErrors"] = {};
  if (!EMAIL_PATTERN.test(email)) fieldErrors.email = email ? "Unesi ispravan mejl." : "Unesi mejl.";
  if (password.length < PASSWORD_MIN) fieldErrors.password = `Lozinka mora imati bar ${PASSWORD_MIN} znakova.`;
  const nameError = displayNameError(displayName);
  if (nameError) fieldErrors.displayName = nameError;
  if (fieldErrors.email || fieldErrors.password || fieldErrors.displayName) {
    return { fieldErrors, values };
  }

  const supabase = await createClient();
  // display_name goes into user metadata; the handle_new_user trigger copies it into profiles.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error) {
    return { ...authErrorState(error), values };
  }
  // Email confirmation is off, so sign-up returns a session. Without one the user can't continue here.
  if (!data.session) {
    return { formError: "Nalog je napravljen, ali prijava nije uspela. Probaj da se prijaviš.", values };
  }

  redirect(safeNextPath(formData.get("next")) ?? HOME_PATH);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
