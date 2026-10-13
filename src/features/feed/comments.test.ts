import { describe, expect, it } from "vitest";
import { COMMENT_MAX_LENGTH, commentBodyError } from "./comments";

describe("commentBodyError", () => {
  it("rejects an empty comment", () => {
    expect(commentBodyError("")).toBe("Napiši komentar.");
  });

  it("accepts up to the limit, counting emoji as one character", () => {
    expect(commentBodyError("Legit trening 💪")).toBeNull();
    expect(commentBodyError("a".repeat(COMMENT_MAX_LENGTH))).toBeNull();
    expect(commentBodyError("💪".repeat(COMMENT_MAX_LENGTH))).toBeNull();
  });

  it("rejects longer comments", () => {
    expect(commentBodyError("a".repeat(COMMENT_MAX_LENGTH + 1))).toMatch(/najviše 500/);
  });
});
