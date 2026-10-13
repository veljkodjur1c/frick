import { describe, expect, it } from "vitest";
import { champSelectWeekStart, isChampSelectOpen, isProposalApproved, isValidProposalPoints } from "./champSelect";

// Inputs are UTC instants. Belgrade is UTC+2 until 2026-10-25, UTC+1 after.
const at = (iso: string) => new Date(iso);

describe("isChampSelectOpen", () => {
  it("opens on Sunday at 18:00 Belgrade time", () => {
    // Sunday 2026-10-18, CEST
    expect(isChampSelectOpen(at("2026-10-18T15:59:00Z"))).toBe(false);
    expect(isChampSelectOpen(at("2026-10-18T16:00:00Z"))).toBe(true);
    expect(isChampSelectOpen(at("2026-10-18T21:59:00Z"))).toBe(true);
  });

  it("follows Belgrade time in winter", () => {
    // Sunday 2026-11-01, CET: 18:00 = 17:00 UTC
    expect(isChampSelectOpen(at("2026-11-01T16:30:00Z"))).toBe(false);
    expect(isChampSelectOpen(at("2026-11-01T17:00:00Z"))).toBe(true);
  });

  it("closes when the new week starts at Monday 00:00", () => {
    // Monday 2026-10-19 00:00 CEST = Sunday 22:00 UTC
    expect(isChampSelectOpen(at("2026-10-18T22:00:00Z"))).toBe(false);
  });

  it("is closed on other days in the evening", () => {
    // Saturday 2026-10-17 20:00 CEST
    expect(isChampSelectOpen(at("2026-10-17T18:00:00Z"))).toBe(false);
  });
});

describe("champSelectWeekStart", () => {
  it("is next Monday", () => {
    expect(champSelectWeekStart(at("2026-10-18T17:00:00Z"))).toBe("2026-10-19");
  });
});

describe("isProposalApproved", () => {
  it("needs 3 Za votes", () => {
    expect(isProposalApproved(2)).toBe(false);
    expect(isProposalApproved(3)).toBe(true);
    expect(isProposalApproved(5)).toBe(true);
  });
});

describe("isValidProposalPoints", () => {
  it("accepts whole points from 5 to 100", () => {
    expect(isValidProposalPoints(5)).toBe(true);
    expect(isValidProposalPoints(100)).toBe(true);
    expect(isValidProposalPoints(4)).toBe(false);
    expect(isValidProposalPoints(101)).toBe(false);
    expect(isValidProposalPoints(12.5)).toBe(false);
    expect(isValidProposalPoints(Number.NaN)).toBe(false);
  });
});
