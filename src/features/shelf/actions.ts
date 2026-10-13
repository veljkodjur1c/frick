"use server";

import { revalidatePath } from "next/cache";
import { CAN_CRAFT_COST } from "@/lib/game/config";
import { missingFlavors, planCraft } from "@/lib/game/cans";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export type CraftResult = { ok: true; flavor: string } | { ok: false; error: string };

/**
 * Spends CAN_CRAFT_COST of the player's duplicates on one random flavor they don't have (by rarity).
 * The roll happens here on the server; craft_can() writes it in one transaction with the service role,
 * because players can't write cans themselves.
 */
export async function craftCan(): Promise<CraftResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Prijavi se ponovo pa pokušaj još jednom." };

  const supabase = await createClient();
  const { data: owned, error } = await supabase
    .from("cans")
    .select("id, flavor")
    .eq("user_id", user.id)
    .is("spent_in", null)
    .order("earned_at")
    .order("id")
    .overrideTypes<Array<{ id: string; flavor: string }>, { merge: false }>();
  if (error) {
    console.error("craftCan: read cans failed", error);
    return { ok: false, error: "Spajanje nije uspelo. Pokušaj ponovo." };
  }

  const plan = planCraft(owned);
  if (!plan) {
    return {
      ok: false,
      error:
        missingFlavors(owned.map((can) => can.flavor)).length === 0
          ? "Već imaš sve ukuse."
          : `Za spajanje ti treba ${CAN_CRAFT_COST} duplikata.`,
    };
  }

  const { error: craftError } = await createAdminClient().rpc("craft_can", {
    p_user_id: user.id,
    p_spend: plan.spend.map((can) => can.id),
    p_flavor: plan.flavor.id,
  });
  if (craftError) {
    console.error("craftCan: craft_can failed", craftError);
    return { ok: false, error: "Spajanje nije uspelo. Pokušaj ponovo." };
  }

  revalidatePath("/shelf");
  return { ok: true, flavor: plan.flavor.id };
}
