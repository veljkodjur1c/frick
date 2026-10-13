// Monster cans for the achievement shelf. Pure data and functions, no DB or UI imports.
// Rule (CLAUDE.md): when the boss dies, every player gets one can (table `cans`, column `flavor` = a flavor id).

export type CanFlavor = {
  /** Stored in cans.flavor. Never rename or remove one that has been awarded. */
  id: string;
  /** Shown on the shelf. */
  name: string;
  /** Color token, i.e. --color-<color> in globals.css. */
  color: string;
};

/** Every flavor on the shelf, in the order they are awarded. Add new ones at the end. */
export const CAN_FLAVORS: readonly CanFlavor[] = [
  { id: "original", name: "Original", color: "can-original" },
  { id: "ultra-white", name: "Ultra White", color: "can-ultra-white" },
  { id: "ultra-blue", name: "Ultra Blue", color: "can-ultra-blue" },
  { id: "ultra-red", name: "Ultra Red", color: "can-ultra-red" },
  { id: "mango-loco", name: "Mango Loco", color: "can-mango-loco" },
  { id: "ultra-violet", name: "Ultra Violet", color: "can-ultra-violet" },
  { id: "pipeline-punch", name: "Pipeline Punch", color: "can-pipeline-punch" },
  { id: "ultra-gold", name: "Ultra Gold", color: "can-ultra-gold" },
  { id: "khaotic", name: "Khaotic", color: "can-khaotic" },
];

const CATALOG_IDS = new Set(CAN_FLAVORS.map((flavor) => flavor.id));

/**
 * The flavor a player gets for their next boss kill: the first flavor they don't have yet.
 * Once they have all of them it cycles, always picking the flavor they have the fewest of.
 * The weekly settlement passes the player's current cans.flavor values.
 */
export function nextCanFlavor(earnedFlavorIds: readonly string[]): CanFlavor {
  const counts = new Map<string, number>();
  for (const id of earnedFlavorIds) counts.set(id, (counts.get(id) ?? 0) + 1);

  let next = CAN_FLAVORS[0];
  for (const flavor of CAN_FLAVORS) {
    if ((counts.get(flavor.id) ?? 0) < (counts.get(next.id) ?? 0)) next = flavor;
  }
  return next;
}

/** How many different catalog flavors a player has, e.g. the 3 in "3 od 9". */
export function countCollected(cans: ReadonlyArray<{ flavor: string }>): number {
  return new Set(cans.map((can) => can.flavor).filter((id) => CATALOG_IDS.has(id))).size;
}

export type ShelfSlot<T> = { flavor: CanFlavor; cans: T[] };

/**
 * One slot per catalog flavor, in catalog order, holding the player's cans of that flavor (input order kept).
 * A flavor id that is not in the catalog still gets a slot at the end, so no earned can disappears.
 */
export function buildShelf<T extends { flavor: string }>(cans: readonly T[]): ShelfSlot<T>[] {
  const slots = new Map<string, ShelfSlot<T>>(CAN_FLAVORS.map((flavor) => [flavor.id, { flavor, cans: [] }]));

  for (const can of cans) {
    let slot = slots.get(can.flavor);
    if (!slot) {
      slot = { flavor: { id: can.flavor, name: can.flavor, color: "gold-300" }, cans: [] };
      slots.set(can.flavor, slot);
    }
    slot.cans.push(can);
  }

  return [...slots.values()];
}
