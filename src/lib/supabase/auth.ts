import "server-only";
import { io } from "next/cache";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "./server";

/**
 * The logged-in user, or null. Server code only.
 * Verifies the session with Supabase Auth (not just the cookie), and runs once per request.
 *
 * Reads cookies, so with Cache Components the calling component must sit inside a <Suspense> boundary.
 * Server Actions and Route Handlers must call this themselves; never trust a user id from the client.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  // Session checks read the clock (token expiry), which can't be prerendered into the static shell.
  // With Cache Components this makes callers wait for a real request; it resolves at once inside one.
  await io();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    return null;
  }
  return data.user;
});

/**
 * The logged-in user, or a redirect to /login. Use at the top of protected pages and Server Actions.
 * Same rules as getCurrentUser(): server code only, and pages must call it inside a <Suspense> boundary.
 */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
