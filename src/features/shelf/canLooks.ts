// How each flavor's can looks on the shelf, after the real cans: body color and claw color (color tokens).
// Visual only, so it lives here and not in the game catalog (src/lib/game/cans.ts).

export type CanLook = { body: string; claw: string };

const DARK = "can-body-dark";
const LIGHT = "can-claw-light";

const LOOKS: Record<string, CanLook> = {
  original: { body: DARK, claw: "can-original" },
  "ultra-white": { body: "can-ultra-white", claw: "can-claw-silver" },
  "ultra-blue": { body: "can-ultra-blue", claw: LIGHT },
  "ultra-red": { body: "can-ultra-red", claw: LIGHT },
  "mango-loco": { body: "can-mango-loco", claw: "can-ultra-gold" },
  "ultra-violet": { body: "can-ultra-violet", claw: LIGHT },
  "pipeline-punch": { body: "can-pipeline-punch", claw: LIGHT },
  "ultra-gold": { body: "can-ultra-gold", claw: LIGHT },
  khaotic: { body: DARK, claw: "can-khaotic" },
};

/** Look of a flavor's can. A flavor that isn't in the list gets a black can with gold claws. */
export function canLook(flavorId: string): CanLook {
  return LOOKS[flavorId] ?? { body: DARK, claw: "gold-300" };
}
