import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildShelf, CAN_FLAVORS, countCollected, nextCanFlavor } from "./cans";

const ids = CAN_FLAVORS.map((flavor) => flavor.id);

describe("CAN_FLAVORS", () => {
  it("has unique ids, each with a color token in globals.css", () => {
    const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");

    expect(new Set(ids).size).toBe(ids.length);
    for (const { color } of CAN_FLAVORS) {
      expect(css).toContain(`--color-${color}:`);
    }
  });
});

describe("nextCanFlavor", () => {
  it("starts with the first flavor", () => {
    expect(nextCanFlavor([]).id).toBe(ids[0]);
  });

  it("gives the first flavor the player doesn't have yet", () => {
    expect(nextCanFlavor([ids[0], ids[1]]).id).toBe(ids[2]);
    expect(nextCanFlavor([ids[1]]).id).toBe(ids[0]);
  });

  it("cycles through the catalog again once the shelf is full", () => {
    expect(nextCanFlavor(ids).id).toBe(ids[0]);
    expect(nextCanFlavor([...ids, ids[0]]).id).toBe(ids[1]);
  });

  it("ignores flavors that are not in the catalog", () => {
    expect(nextCanFlavor(["old-flavor", ids[0]]).id).toBe(ids[1]);
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
