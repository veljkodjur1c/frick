import { describe, expect, it } from "vitest";
import { currentWeekStart, dayOfWeek, hourOf, nextWeekStart, weekEndOf, weekStartOf } from "./week";

// Belgrade is UTC+2 in summer (CEST) and UTC+1 in winter (CET). Inputs below are UTC instants.
const at = (iso: string) => new Date(iso);

describe("weekStartOf", () => {
  it("finds Monday for a normal mid-week day", () => {
    // Wednesday 2026-10-14 12:00 CEST
    expect(weekStartOf(at("2026-10-14T10:00:00Z"))).toBe("2026-10-12");
    expect(dayOfWeek(at("2026-10-14T10:00:00Z"))).toBe(3);
  });

  it("keeps Sunday 23:59 in the old week", () => {
    // Sunday 2026-10-18 23:59 CEST = 21:59 UTC
    const sunday = at("2026-10-18T21:59:00Z");
    expect(weekStartOf(sunday)).toBe("2026-10-12");
    expect(dayOfWeek(sunday)).toBe(7);
  });

  it("starts the new week at Monday 00:00 Belgrade time, while UTC is still Sunday", () => {
    // Monday 2026-10-19 00:00 CEST = Sunday 22:00 UTC
    const monday = at("2026-10-18T22:00:00Z");
    expect(weekStartOf(monday)).toBe("2026-10-19");
    expect(dayOfWeek(monday)).toBe(1);
  });

  it("handles the switch to winter time (Sunday 2026-10-25)", () => {
    // 03:00 CEST -> 02:00 CET on Sunday 2026-10-25, so that week's end is UTC+1.
    expect(weekStartOf(at("2026-10-25T00:30:00Z"))).toBe("2026-10-19"); // 02:30 CEST, before the switch
    expect(weekStartOf(at("2026-10-25T01:30:00Z"))).toBe("2026-10-19"); // 02:30 CET, after the switch
    expect(weekStartOf(at("2026-10-25T22:59:00Z"))).toBe("2026-10-19"); // Sunday 23:59 CET
    expect(weekStartOf(at("2026-10-25T23:00:00Z"))).toBe("2026-10-26"); // Monday 00:00 CET
  });

  it("crosses the new year", () => {
    expect(weekStartOf(at("2026-12-31T12:00:00Z"))).toBe("2026-12-28");
    // Friday 2027-01-01 00:30 CET = Thursday 2026-12-31 23:30 UTC
    expect(weekStartOf(at("2026-12-31T23:30:00Z"))).toBe("2026-12-28");
    expect(dayOfWeek(at("2026-12-31T23:30:00Z"))).toBe(5);
  });
});

describe("weekEndOf / nextWeekStart", () => {
  it("returns Sunday and the next Monday", () => {
    expect(weekEndOf("2026-10-12")).toBe("2026-10-18");
    expect(nextWeekStart("2026-10-12")).toBe("2026-10-19");
  });

  it("is not thrown off by the winter time switch", () => {
    expect(weekEndOf("2026-10-19")).toBe("2026-10-25");
    expect(nextWeekStart("2026-10-19")).toBe("2026-10-26");
  });

  it("crosses the new year", () => {
    expect(weekEndOf("2026-12-28")).toBe("2027-01-03");
    expect(nextWeekStart("2026-12-28")).toBe("2027-01-04");
  });

  it("rejects dates that are not a Monday or not valid", () => {
    expect(() => weekEndOf("2026-10-13")).toThrow(/not a Monday/);
    expect(() => nextWeekStart("2026-02-30")).toThrow(/Invalid date/);
    expect(() => weekEndOf("12.10.2026")).toThrow(/Invalid date/);
  });
});

describe("currentWeekStart", () => {
  it("uses the given time", () => {
    expect(currentWeekStart(at("2026-10-13T08:00:00Z"))).toBe("2026-10-12");
  });

  it("defaults to now and always returns a Monday", () => {
    const start = currentWeekStart();
    expect(start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(`${start}T00:00:00Z`).getUTCDay()).toBe(1);
  });
});

describe("hourOf", () => {
  it("uses Belgrade time in summer and winter", () => {
    // 16:00 UTC = 18:00 CEST, 17:00 CET
    expect(hourOf(at("2026-10-18T16:00:00Z"))).toBe(18);
    expect(hourOf(at("2026-11-01T16:00:00Z"))).toBe(17);
  });

  it("counts midnight as 0", () => {
    // Monday 2026-10-19 00:30 CEST
    expect(hourOf(at("2026-10-18T22:30:00Z"))).toBe(0);
  });
});
