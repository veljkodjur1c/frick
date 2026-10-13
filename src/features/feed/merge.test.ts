import { describe, expect, it } from "vitest";
import { mergeNewestFirst } from "./merge";

const at = (id: string, minute: number) => ({ id, createdAt: `2026-10-13T12:${String(minute).padStart(2, "0")}:00Z` });

describe("mergeNewestFirst", () => {
  it("interleaves two newest-first lists", () => {
    const posts = [at("p3", 30), at("p1", 10)];
    const proofs = [at("x2", 20), at("x0", 5)];
    expect(mergeNewestFirst([posts, proofs], 10).items.map((i) => i.id)).toEqual(["p3", "x2", "p1", "x0"]);
  });

  it("cuts to the limit and reports more", () => {
    const result = mergeNewestFirst([[at("a", 3), at("b", 1)], [at("c", 2)]], 2);
    expect(result.items.map((i) => i.id)).toEqual(["a", "c"]);
    expect(result.hasMore).toBe(true);
  });

  it("has no more when everything fits", () => {
    expect(mergeNewestFirst([[at("a", 1)], []], 2)).toEqual({ items: [at("a", 1)], hasMore: false });
  });
});
