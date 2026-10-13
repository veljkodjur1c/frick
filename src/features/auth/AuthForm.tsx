"use client";

import { useActionState, useState } from "react";
import { Button, Input, SegmentedControl } from "@/components/ui";
import { DISPLAY_NAME_MAX } from "@/features/profile/displayName";
import { signIn, signUp, type AuthFormState } from "./actions";
import { PASSWORD_MIN } from "./password";

type Mode = "signIn" | "signUp";

const MODES = [
  { value: "signIn", label: "Prijava" },
  { value: "signUp", label: "Registracija" },
] as const;

const INITIAL_STATE: AuthFormState = {};

/** Login and sign-up in one form. `next` is where to go after success (already validated by the page). */
export function AuthForm({ next }: { next: string }) {
  const [mode, setMode] = useState<Mode>("signIn");
  const [signInState, signInAction, signInPending] = useActionState(signIn, INITIAL_STATE);
  const [signUpState, signUpAction, signUpPending] = useActionState(signUp, INITIAL_STATE);

  const isSignUp = mode === "signUp";
  const state = isSignUp ? signUpState : signInState;
  const pending = isSignUp ? signUpPending : signInPending;

  return (
    <div className="flex flex-col gap-6">
      <SegmentedControl label="Prijava ili registracija" options={MODES} value={mode} onChange={setMode} fullWidth />

      {/* key: switching modes starts a fresh form, so React's reset after an action uses the right defaults. */}
      <form key={mode} action={isSignUp ? signUpAction : signInAction} noValidate className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />

        {isSignUp && (
          <Input
            label="Ime u igri"
            name="displayName"
            autoComplete="nickname"
            maxLength={DISPLAY_NAME_MAX}
            required
            hint="Ovo ime vidi ekipa. Možeš ga promeniti kasnije."
            defaultValue={state.values?.displayName}
            error={state.fieldErrors?.displayName}
          />
        )}
        <Input
          label="Mejl"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          required
          defaultValue={state.values?.email}
          error={state.fieldErrors?.email}
        />
        <Input
          label="Lozinka"
          name="password"
          type="password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          required
          minLength={isSignUp ? PASSWORD_MIN : undefined}
          hint={isSignUp ? `Bar ${PASSWORD_MIN} znakova.` : undefined}
          error={state.fieldErrors?.password}
        />

        {state.formError && (
          <p role="alert" className="text-sm text-danger">
            {state.formError}
          </p>
        )}

        <Button type="submit" variant="primary" size="lg" fullWidth loading={pending}>
          {isSignUp ? "Napravi nalog" : "Prijavi se"}
        </Button>
      </form>
    </div>
  );
}
