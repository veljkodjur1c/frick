"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui";
import { signOut } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" fullWidth loading={pending}>
      Odjavi se
    </Button>
  );
}

export function SignOutButton() {
  return (
    <form action={signOut}>
      <SubmitButton />
    </form>
  );
}
