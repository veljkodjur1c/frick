import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildShelf,
  CAN_FLAVORS,
  collectors,
  completedAt,
  countCollected,
  duplicateStreak,
  flavorChance,
  missingFlavors,
  pickFlavor,
  planCraft,
  rollCan,
  spareCans,
} from "./cans";
import { CAN_CRAFT_COST, CAN_PITY_DUPLICATES, CAN_RARITY_CHANCE } from "./config";

const ids = CAN_FLAVORS.map((flavor) => flavor.id);
const flavor = (id: string) => CAN_FLAVORS.find((f) => f.id === id)!;
/** A Random that always returns `value`. */
const fixed = (value: number) => () => value;

describe("CAN_FLAVORS", () => {
  it("has unique ids, each with a color token in globals.css", () => {
    const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");

    expect(new Set(ids).size).toBe(ids.length);
    for (const { color } of CAN_FLAVORS) {
      expect(css).toContain(`--color-${color}:`);
    }
  });

  it("splits 50 / 35 / 15 % between the rarities", () => {
    expect(CAN_RARITY_CHANCE).toEqual({ common: 0.5, rare: 0.35, legendary: 0.15 });
    for (const rarity of ["common", "rare", "legendary"] as const) {
      const sum = CAN_FLAVORS.filter((f) => f.rarity === rarity).reduce((s, f) => s + flavorChance(f), 0);
      expect(sum).toBeCloseTo(CAN_RARITY_CHANCE[rarity]);
    }
    expect(flavorChance(flavor("original"))).toBeCloseTo(0.125);
    expect(flavorChance(flavor("khaotic"))).toBeCloseTo(0.075);
  });
});

describe("pickFlavor", () => {
  it("maps the roll onto the weighted list", () => {
    expect(pickFlavor(CAN_FLAVORS, fixed(0)).id).toBe("original");
    expect(pickFlavor(CAN_FLAVORS, fixed(0.49)).id).toBe("ultra-red");
    expect(pickFlavor(CAN_FLAVORS, fixed(0.5)).id).toBe("mango-loco");
    expect(pickFlavor(CAN_FLAVORS, fixed(0.999)).id).toBe("khaotic");
  });

  it("keeps rarity odds inside a subset", () => {
    const subset = [flavor("original"), flavor("khaotic")];
    // original 0.125 vs khaotic 0.075 -> original wins below 0.625.
    expect(pickFlavor(subset, fixed(0.6)).id).toBe("original");
    expect(pickFlavor(subset, fixed(0.65)).id).toBe("khaotic");
  });
});

describe("duplicateStreak", () => {
  it("counts duplicates at the end and resets on a new flavor", () => {
    expect(duplicateStreak([])).toBe(0);
    expect(duplicateStreak(["original", "original", "original"])).toBe(2);
    expect(duplicateStreak(["original", "original", "khaotic"])).toBe(0);
    expect(duplicateStreak(["original", "khaotic", "original", "khaotic", "original"])).toBe(3);
  });
});

describe("rollCan", () => {
  it("rolls from every flavor, duplicates included", () => {
    expect(rollCan(["original"], fixed(0)).id).toBe("original");
  });

  it(`gives a missing flavor after ${CAN_PITY_DUPLICATES} duplicates in a row`, () => {
    const unlucky = ["original", ...Array(CAN_PITY_DUPLICATES).fill("original")];
    expect(rollCan(unlucky, fixed(0)).id).not.toBe("original");
    expect(missingFlavors(unlucky).map((f) => f.id)).toContain(rollCan(unlucky, fixed(0.3)).id);
  });

  it("rolls normally once the shelf is full", () => {
    expect(rollCan([...ids, "original", "original", "original"], fixed(0)).id).toBe("original");
  });
});

describe("spareCans and planCraft", () => {
  const can = (id: number, f: string) => ({ id: `c${id}`, flavor: f });

  it("never spends the last can of a flavor and takes the biggest piles first", () => {
    const owned = [can(1, "original"), can(2, "ultra-blue"), can(3, "original"), can(4, "original"), can(5, "ultra-blue")];
    expect(spareCans(owned).map((c) => c.id)).toEqual(["c3", "c4", "c5"]);
  });

  it(`spends ${CAN_CRAFT_COST} spares for a missing flavor`, () => {
    const owned = [can(1, "original"), can(2, "original"), can(3, "original"), can(4, "original")];
    const plan = planCraft(owned, fixed(0));
    expect(plan?.spend.map((c) => c.id)).toEqual(["c2", "c3", "c4"]);
    expect(plan?.flavor.id).toBe("ultra-white");
  });

  it("is not possible without enough spares or with a full shelf", () => {
    expect(planCraft([can(1, "original"), can(2, "original"), can(3, "ultra-blue")])).toBeNull();
    expect(planCraft([...ids.map((f, i) => can(i, f)), can(20, "original"), can(21, "original"), can(22, "original")])).toBeNull();
  });
});

describe("completedAt and collectors", () => {
  const at = (minute: number) => `2026-10-${String(10 + minute).padStart(2, "0")}T12:00:00Z`;
  const full = (start: number) => ids.map((f, i) => ({ flavor: f, earnedAt: at(start + i) }));

  it("is the moment of the can that completed the set", () => {
    expect(completedAt(full(0))).toBe(at(8));
    expect(completedAt(full(0).slice(0, 8))).toBeNull();
  });

  it("gives the title to the first collector and the frame to everyone who completed", () => {
    const result = collectors([
      { id: "ana", history: full(1) },
      { id: "marko", history: full(0) },
      { id: "jova", history: full(0).slice(0, 5) },
    ]);
    expect([...result.first]).toEqual(["marko"]);
    expect([...result.completed].sort()).toEqual(["ana", "marko"]);
  });

  it("shares the title on a tie and is empty when nobody completed", () => {
    expect([...collectors([{ id: "a", history: full(0) }, { id: "b", history: full(0) }]).first].sort()).toEqual(["a", "b"]);
    expect(collectors([{ id: "a", history: [] }]).first.size).toBe(0);
  });
});

describe("countCollected", () => {
  it("counts different catalog flavors only", () => {
    const cans = [{ flavor: ids[0] }, { flavor: ids[0] }, { flavor: ids[3] }, { flavor: "old-flavor" }];
    expect(countCollected(cans)).toBe(2);
    expect(countCollected([])).toBe(0);
  });
});

describe("buildShelf", () => {
  it("has one slot per flavor in catalog order, even when empty", () => {
    const shelf = buildShelf([]);
    expect(shelf.map((slot) => slot.flavor.id)).toEqual(ids);
    expect(shelf.every((slot) => slot.cans.length === 0)).toBe(true);
  });

  it("puts each can in its flavor's slot and keeps the input order", () => {
    const shelf = buildShelf([
      { flavor: ids[2], boss: "Baron" },
      { flavor: ids[0], boss: "Drake" },
      { flavor: ids[2], boss: "Herald" },
    ]);

    expect(shelf[0].cans).toEqual([{ flavor: ids[0], boss: "Drake" }]);
    expect(shelf[2].cans.map((can) => can.boss)).toEqual(["Baron", "Herald"]);
  });

  it("adds a slot at the end for unknown flavors", () => {
    const shelf = buildShelf([{ flavor: "old-flavor" }]);

    expect(shelf).toHaveLength(ids.length + 1);
    expect(shelf.at(-1)).toMatchObject({ flavor: { id: "old-flavor", name: "old-flavor" }, cans: [{ flavor: "old-flavor" }] });
  });
});
