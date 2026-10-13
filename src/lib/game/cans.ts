// Monster cans for the achievement shelf. Pure data and functions, no DB or UI imports.
// Rules (CLAUDE.md, "Monster cans"): random cans by rarity, bad-luck protection, crafting 3 duplicates into a
// missing flavor, and "Kolekcionar" for the first player with every flavor. Numbers live in config.ts.

import { CAN_CRAFT_COST, CAN_PITY_DUPLICATES, CAN_RARITY_CHANCE } from "./config";

export type CanRarity = keyof typeof CAN_RARITY_CHANCE;

export type CanFlavor = {
  /** Stored in cans.flavor. Never rename or remove one that has been awarded. */
  id: string;
  /** Shown on the shelf. */
  name: string;
  /** Color token, i.e. --color-<color> in globals.css. */
  color: string;
  rarity: CanRarity;
};

/** Every flavor on the shelf, in shelf order. Add new ones at the end. */
export const CAN_FLAVORS: readonly CanFlavor[] = [
  { id: "original", name: "Original", color: "can-original", rarity: "common" },
  { id: "ultra-white", name: "Ultra White", color: "can-ultra-white", rarity: "common" },
  { id: "ultra-blue", name: "Ultra Blue", color: "can-ultra-blue", rarity: "common" },
  { id: "ultra-red", name: "Ultra Red", color: "can-ultra-red", rarity: "common" },
  { id: "mango-loco", name: "Mango Loco", color: "can-mango-loco", rarity: "rare" },
  { id: "ultra-violet", name: "Ultra Violet", color: "can-ultra-violet", rarity: "rare" },
  { id: "pipeline-punch", name: "Pipeline Punch", color: "can-pipeline-punch", rarity: "rare" },
  { id: "ultra-gold", name: "Ultra Gold", color: "can-ultra-gold", rarity: "legendary" },
  { id: "khaotic", name: "Khaotic", color: "can-khaotic", rarity: "legendary" },
];

const CATALOG_IDS = new Set(CAN_FLAVORS.map((flavor) => flavor.id));

/** A number in [0, 1), like Math.random. Passed in so tests can fix the roll. */
export type Random = () => number;

/** Chance of one flavor in a full roll: its rarity's chance split evenly between the flavors of that rarity. */
export function flavorChance(flavor: CanFlavor): number {
  const sameRarity = CAN_FLAVORS.filter((other) => other.rarity === flavor.rarity).length;
  return CAN_RARITY_CHANCE[flavor.rarity] / sameRarity;
}

/** Picks one of `from` at random, each weighted by flavorChance (so rarities keep their odds among any subset). */
export function pickFlavor(from: readonly CanFlavor[], random: Random = Math.random): CanFlavor {
  const total = from.reduce((sum, flavor) => sum + flavorChance(flavor), 0);
  let roll = random() * total;
  for (const flavor of from) {
    roll -= flavorChance(flavor);
    if (roll < 0) return flavor;
  }
  return from[from.length - 1];
}

/** Catalog flavors not among `owned` flavor ids. */
export function missingFlavors(owned: Iterable<string>): CanFlavor[] {
  const have = new Set(owned);
  return CAN_FLAVORS.filter((flavor) => !have.has(flavor.id));
}

/** How many duplicates in a row end a player's can history (flavor ids, oldest first). A new flavor resets it. */
export function duplicateStreak(history: readonly string[]): number {
  const seen = new Set<string>();
  let streak = 0;
  for (const id of history) {
    if (seen.has(id)) {
      streak += 1;
    } else {
      seen.add(id);
      streak = 0;
    }
  }
  return streak;
}

/**
 * The flavor of a player's next can: random by rarity, duplicates allowed. After CAN_PITY_DUPLICATES duplicates
 * in a row it is a flavor they don't have yet. `history` is every can they ever got (spent ones too), oldest first.
 */
export function rollCan(history: readonly string[], random: Random = Math.random): CanFlavor {
  const missing = missingFlavors(history);
  const pity = missing.length > 0 && duplicateStreak(history) >= CAN_PITY_DUPLICATES;
  return pickFlavor(pity ? missing : CAN_FLAVORS, random);
}

/**
 * Cans a player may spend on crafting: every copy of a flavor except the first one in `owned`, biggest piles
 * first. So the last can of a flavor is never spent.
 */
export function spareCans<T extends { flavor: string }>(owned: readonly T[]): T[] {
  const piles = new Map<string, T[]>();
  for (const can of owned) piles.set(can.flavor, [...(piles.get(can.flavor) ?? []), can]);
  return [...piles.values()].sort((a, b) => b.length - a.length).flatMap((pile) => pile.slice(1));
}

/**
 * A craft: CAN_CRAFT_COST spare cans in, one random missing flavor (by rarity) out.
 * `owned` are the player's unspent cans. Null when they lack spares or already have every flavor.
 */
export function planCraft<T extends { flavor: string }>(
  owned: readonly T[],
  random: Random = Math.random,
): { spend: T[]; flavor: CanFlavor } | null {
  const missing = missingFlavors(owned.map((can) => can.flavor));
  const spare = spareCans(owned);
  if (missing.length === 0 || spare.length < CAN_CRAFT_COST) return null;
  return { spend: spare.slice(0, CAN_CRAFT_COST), flavor: pickFlavor(missing, random) };
}

/** When a player first had every flavor: the time of the can that completed the set, or null. History oldest first. */
export function completedAt(history: ReadonlyArray<{ flavor: string; earnedAt: string }>): string | null {
  const needed = new Set(CATALOG_IDS);
  for (const can of history) {
    needed.delete(can.flavor);
    if (needed.size === 0) return can.earnedAt;
  }
  return null;
}

/** "Kolekcionar": who completed the shelf first (ties share it), and everyone who completed it. */
export function collectors(
  players: ReadonlyArray<{ id: string; history: ReadonlyArray<{ flavor: string; earnedAt: string }> }>,
): { first: Set<string>; completed: Set<string> } {
  const done = players.flatMap((player) => {
    const at = completedAt(player.history);
    return at ? [{ id: player.id, time: Date.parse(at) }] : [];
  });
  const earliest = Math.min(...done.map((player) => player.time));
  return {
    first: new Set(done.filter((player) => player.time === earliest).map((player) => player.id)),
    completed: new Set(done.map((player) => player.id)),
  };
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
      slot = { flavor: { id: can.flavor, name: can.flavor, color: "gold-300", rarity: "common" }, cans: [] };
      slots.set(can.flavor, slot);
    }
    slot.cans.push(can);
  }

  return [...slots.values()];
}
