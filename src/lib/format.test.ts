import { describe, expect, it } from "vitest";
import { formatDate, formatTaskCount, formatTimeAgo } from "./format";

describe("formatDate", () => {
  it("shows day and short month in Belgrade time", () => {
    // 22:30 UTC on Sunday is already Monday in Belgrade.
    expect(formatDate(new Date("2026-10-18T22:30:00Z"))).toMatch(/^19\. okt/);
  });
});

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

describe("formatTaskCount", () => {
  it("uses the Serbian plural forms", () => {
    expect(formatTaskCount(1)).toBe("1 task");
    expect(formatTaskCount(3)).toBe("3 taska");
    expect(formatTaskCount(5)).toBe("5 taskova");
    expect(formatTaskCount(12)).toBe("12 taskova");
    expect(formatTaskCount(21)).toBe("21 task");
    expect(formatTaskCount(24)).toBe("24 taska");
  });
});
