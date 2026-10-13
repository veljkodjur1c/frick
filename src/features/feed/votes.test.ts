import { describe, expect, it } from "vitest";
import { applyVote, nextVote, postVerdict } from "./votes";

describe("postVerdict", () => {
  it("is valid when Legit leads and freak when Cap leads", () => {
    expect(postVerdict({ legit: 3, cap: 1 })).toBe("valid");
    expect(postVerdict({ legit: 1, cap: 2 })).toBe("freak");
  });

  it("has no badge without votes or on a tie", () => {
    expect(postVerdict({ legit: 0, cap: 0 })).toBeNull();
    expect(postVerdict({ legit: 2, cap: 2 })).toBeNull();
  });
});

describe("nextVote", () => {
  it("casts, switches and takes back a vote", () => {
    expect(nextVote(null, "legit")).toBe("legit");
    expect(nextVote("legit", "cap")).toBe("cap");
    expect(nextVote("cap", "cap")).toBeNull();
  });
});

describe("applyVote", () => {
  it("adds a new vote", () => {
    expect(applyVote({ legit: 1, cap: 0, mine: null }, "cap")).toEqual({ legit: 1, cap: 1, mine: "cap" });
  });

  it("moves a switched vote to the other side", () => {
    expect(applyVote({ legit: 2, cap: 1, mine: "legit" }, "cap")).toEqual({ legit: 1, cap: 2, mine: "cap" });
  });

  it("removes a taken back vote", () => {
    expect(applyVote({ legit: 2, cap: 1, mine: "legit" }, null)).toEqual({ legit: 1, cap: 1, mine: null });
  });
});
