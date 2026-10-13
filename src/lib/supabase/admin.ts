import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

/**
 * Supabase client with the service role key. It BYPASSES Row Level Security.
 *
 * Only for trusted server code (Server Actions, Route Handlers, cron) that writes the system tables
 * (weeks, bosses, tasks, awards, cans), and only after checking who the user is (requireUser()).
 * Never import it from a Client Component and never pass its results to the client unfiltered.
 * Create a new one per call; it holds no session.
 */
export function createAdminClient() {
  const { url } = getSupabaseEnv();
  // Not NEXT_PUBLIC_, so Next.js never inlines it into the browser bundle; "server-only" above
  // makes any client import a build error.
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "Missing env variable SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local (server only, see .env.example).",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
