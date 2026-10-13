import { describe, expect, it } from "vitest";
import { formatTimeAgo } from "./format";

describe("formatTimeAgo", () => {
  const now = new Date("2026-10-13T12:00:00Z");
  const ago = (seconds: number) => formatTimeAgo(new Date(now.getTime() - seconds * 1000), now);

  it("says now for the last minute", () => {
    expect(ago(20)).toBe("sada");
  });

  it("uses minutes, hours and days within a week", () => {
    expect(ago(5 * 60)).toBe("pre 5 minuta");
    expect(ago(3 * 3600)).toBe("pre 3 sata");
    expect(ago(86400)).toBe("juče");
  });

  it("shows the date after a week", () => {
    expect(ago(10 * 86400)).toMatch(/^3\. okt/);
  });
});
