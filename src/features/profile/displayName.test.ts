import { describe, expect, it } from "vitest";
import { displayNameError } from "./displayName";

describe("displayNameError", () => {
  it("accepts 1 to 32 characters", () => {
    expect(displayNameError("A")).toBeNull();
    expect(displayNameError("a".repeat(32))).toBeNull();
  });

  it("rejects empty and too long names", () => {
    expect(displayNameError("")).not.toBeNull();
    expect(displayNameError("a".repeat(33))).not.toBeNull();
  });

  it("counts characters like Postgres, not UTF-16 units", () => {
    expect(displayNameError("🐉".repeat(32))).toBeNull();
  });
});
