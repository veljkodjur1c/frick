"use server";

import { getCurrentUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

/** PushSubscription.toJSON() from the browser. */
export type PushSubscriptionInput = { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

/**
 * Saves this phone's push subscription for the viewer (save_push_subscription() takes it over if another player
 * subscribed on the same phone before). Returns an error message, or null.
 */
export async function savePushSubscription(subscription: PushSubscriptionInput): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return "Prijavi se ponovo pa pokušaj još jednom.";

  const endpoint = subscription?.endpoint;
  const p256dh = subscription?.keys?.p256dh;
  const auth = subscription?.keys?.auth;
  if (
    typeof endpoint !== "string" ||
    !endpoint.startsWith("https://") ||
    endpoint.length > 1000 ||
    typeof p256dh !== "string" ||
    p256dh.length > 200 ||
    typeof auth !== "string" ||
    auth.length > 100
  ) {
    return "Obaveštenja nisu uključena. Pokušaj ponovo.";
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_push_subscription", {
    p_endpoint: endpoint,
    p_p256dh: p256dh,
    p_auth: auth,
  });
  if (error) {
    console.error("savePushSubscription failed", error);
    return "Obaveštenja nisu uključena. Pokušaj ponovo.";
  }
  return null;
}
