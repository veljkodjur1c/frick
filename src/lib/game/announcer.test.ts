import { describe, expect, it } from "vitest";
import { announcerEvents, type AnnouncerCompletion, type AnnouncerEvent, type AnnouncerWeek } from "./announcer";
import { PLAYERS } from "./config";

// Week of Monday 2026-10-12. Belgrade is UTC+2 until 2026-10-25, so 08:00Z is 10:00 in Belgrade.
const TEAM = ["ana", "bob", "cid", "dan", "eve", "fil"].slice(0, PLAYERS);

let nextId = 0;

/** An approved completion that counted at `at` (done then too, unless `createdAt` says otherwise). */
function done(
  userId: string,
  points: number,
  at: string,
  { createdAt = at, task = "Teretana" }: { createdAt?: string; task?: string } = {},
): AnnouncerCompletion {
  nextId += 1;
  return { id: `c${nextId}`, userId, taskTitle: task, points, createdAt, resolvedAt: at };
}

function week(overrides: Partial<AnnouncerWeek> = {}): AnnouncerWeek {
  return {
    id: "w1",
    startsOn: "2026-10-12",
    boss: { name: "Baron Nashor", hp: 100 },
    completions: [],
    mvpIds: [],
    feederIds: [],
    settledAt: null,
    ...overrides,
  };
}

function ofKind<K extends AnnouncerEvent["kind"]>(events: AnnouncerEvent[], kind: K) {
  return events.filter((event): event is Extract<AnnouncerEvent, { kind: K }> => event.kind === kind);
}

describe("announcerEvents", () => {
  it("is empty for a week without completions", () => {
    expect(announcerEvents([week()])).toEqual([]);
    expect(announcerEvents([])).toEqual([]);
  });

  it("lists the events newest first", () => {
    const events = announcerEvents([
      week({
        boss: { name: "Baron Nashor", hp: 50 },
        completions: [done("ana", 20, "2026-10-12T08:00:00Z"), done("bob", 30, "2026-10-14T08:00:00Z")],
      }),
    ]);
    expect(events.map((event) => [event.kind, event.at])).toEqual([
      ["last-hit", "2026-10-14T08:00:00Z"],
      ["first-blood", "2026-10-12T08:00:00Z"],
    ]);
  });

  it("gives every event its own id", () => {
    const completions = TEAM.map((id) => done(id, 30, "2026-10-13T08:00:00Z"));
    const events = announcerEvents([
      week({ id: "w1", completions }),
      week({ id: "w2", startsOn: "2026-10-19", completions }),
    ]);
    expect(new Set(events.map((event) => event.id)).size).toBe(events.length);
  });
});

describe("First Blood", () => {
  it("goes to the first task that counts, with its title", () => {
    const events = announcerEvents([
      week({
        completions: [
          done("bob", 10, "2026-10-13T09:00:00Z"),
          done("ana", 10, "2026-10-12T10:00:00Z", { task: "Kafa pre 8" }),
        ],
      }),
    ]);
    expect(ofKind(events, "first-blood")).toEqual([
      {
        id: "first-blood-w1",
        weekId: "w1",
        at: "2026-10-12T10:00:00Z",
        kind: "first-blood",
        userId: "ana",
        taskTitle: "Kafa pre 8",
      },
    ]);
  });

  it("counts a proof from when it was approved, not when it was uploaded", () => {
    const events = announcerEvents([
      week({
        completions: [
          // Uploaded Monday morning, approved Tuesday.
          done("ana", 10, "2026-10-13T09:00:00Z", { createdAt: "2026-10-12T06:00:00Z" }),
          done("bob", 10, "2026-10-12T10:00:00Z"),
        ],
      }),
    ]);
    expect(ofKind(events, "first-blood")[0].userId).toBe("bob");
  });
});

describe("Last hit", () => {
  it("goes to the task that brings the damage up to the boss HP", () => {
    const events = announcerEvents([
      week({
        completions: [
          done("cid", 30, "2026-10-15T08:00:00Z"),
          done("ana", 40, "2026-10-13T08:00:00Z"),
          done("bob", 30, "2026-10-14T08:00:00Z"),
        ],
      }),
    ]);
    expect(ofKind(events, "last-hit")).toEqual([
      {
        id: "last-hit-w1",
        weekId: "w1",
        at: "2026-10-15T08:00:00Z",
        kind: "last-hit",
        userId: "cid",
        bossName: "Baron Nashor",
      },
    ]);
  });

  it("needs the boss to reach 0 HP", () => {
    const below = [done("ana", 60, "2026-10-13T08:00:00Z"), done("bob", 39, "2026-10-14T08:00:00Z")];
    expect(ofKind(announcerEvents([week({ completions: below })]), "last-hit")).toEqual([]);

    const exact = [...below, done("cid", 1, "2026-10-15T08:00:00Z")];
    expect(ofKind(announcerEvents([week({ completions: exact })]), "last-hit")[0].userId).toBe("cid");
  });

  it("has no last hit in a week without a boss", () => {
    const events = announcerEvents([week({ boss: null, completions: [done("ana", 500, "2026-10-13T08:00:00Z")] })]);
    expect(ofKind(events, "last-hit")).toEqual([]);
  });
});

describe("Pentakill", () => {
  it(`needs all ${PLAYERS} players on the same day and happens when the last one counts`, () => {
    const completions = TEAM.map((id, i) => done(id, 10, `2026-10-13T0${i + 5}:00:00Z`));
    const events = ofKind(announcerEvents([week({ completions })]), "pentakill");
    expect(events).toEqual([
      {
        id: "pentakill-w1-2026-10-12+2",
        weekId: "w1",
        at: `2026-10-13T0${PLAYERS + 4}:00:00Z`,
        kind: "pentakill",
        userIds: TEAM,
      },
    ]);
  });

  it("doesn't count the same player twice", () => {
    const completions = [
      ...TEAM.slice(1).map((id) => done(id, 10, "2026-10-13T08:00:00Z")),
      done(TEAM[1], 10, "2026-10-13T09:00:00Z"),
    ];
    expect(ofKind(announcerEvents([week({ completions })]), "pentakill")).toEqual([]);
  });

  it("splits days at midnight in Belgrade", () => {
    const team = TEAM.slice(1).map((id) => done(id, 10, "2026-10-13T08:00:00Z"));
    // 23:30 on Tuesday in Belgrade.
    const sameDay = [...team, done(TEAM[0], 10, "2026-10-13T21:30:00Z")];
    expect(ofKind(announcerEvents([week({ completions: sameDay })]), "pentakill")).toHaveLength(1);
    // 00:30 on Wednesday in Belgrade.
    const nextDay = [...team, done(TEAM[0], 10, "2026-10-13T22:30:00Z")];
    expect(ofKind(announcerEvents([week({ completions: nextDay })]), "pentakill")).toEqual([]);
  });

  it("counts a proof for the day it was done, once it is approved", () => {
    const completions = [
      ...TEAM.slice(1).map((id) => done(id, 10, "2026-10-13T08:00:00Z")),
      // Uploaded Tuesday, approved Wednesday.
      done(TEAM[0], 10, "2026-10-14T12:00:00Z", { createdAt: "2026-10-13T10:00:00Z" }),
    ];
    const events = ofKind(announcerEvents([week({ completions })]), "pentakill");
    expect(events.map((event) => event.at)).toEqual(["2026-10-14T12:00:00Z"]);
  });

  it("can happen on several days of a week", () => {
    const completions = ["2026-10-13T08:00:00Z", "2026-10-15T08:00:00Z"].flatMap((at) =>
      TEAM.map((id) => done(id, 10, at)),
    );
    expect(ofKind(announcerEvents([week({ completions })]), "pentakill")).toHaveLength(2);
  });
});

describe("Shutdown", () => {
  const lastWeek = week({ id: "w0", startsOn: "2026-10-05", mvpIds: ["ana"], feederIds: ["eve"] });
  const SETTLED = "2026-10-19T06:00:00Z";

  it("goes to last week's Feeder who ends the week ahead of last week's MVP", () => {
    const thisWeek = week({
      completions: [done("eve", 60, "2026-10-13T08:00:00Z"), done("ana", 50, "2026-10-14T08:00:00Z")],
      settledAt: SETTLED,
    });
    expect(ofKind(announcerEvents([lastWeek, thisWeek]), "shutdown")).toEqual([
      { id: "shutdown-w1-eve", weekId: "w1", at: SETTLED, kind: "shutdown", userId: "eve", overtakenIds: ["ana"] },
    ]);
  });

  it("needs strictly more points", () => {
    const thisWeek = week({
      completions: [done("eve", 50, "2026-10-13T08:00:00Z"), done("ana", 50, "2026-10-14T08:00:00Z")],
      settledAt: SETTLED,
    });
    expect(ofKind(announcerEvents([lastWeek, thisWeek]), "shutdown")).toEqual([]);
  });

  it("waits for the week to be settled", () => {
    const thisWeek = week({ completions: [done("eve", 60, "2026-10-13T08:00:00Z")] });
    expect(ofKind(announcerEvents([lastWeek, thisWeek]), "shutdown")).toEqual([]);
  });

  it("must beat every MVP when last week's MVP was shared", () => {
    const sharedMvp = { ...lastWeek, mvpIds: ["ana", "bob"] };
    const completions = [
      done("eve", 60, "2026-10-13T08:00:00Z"),
      done("ana", 10, "2026-10-14T08:00:00Z"),
      done("bob", 70, "2026-10-14T09:00:00Z"),
    ];
    const thisWeek = week({ completions, settledAt: SETTLED });
    expect(ofKind(announcerEvents([sharedMvp, thisWeek]), "shutdown")).toEqual([]);
  });

  it("only looks at the week right before", () => {
    const twoWeeksAgo = { ...lastWeek, startsOn: "2026-09-28" };
    const thisWeek = week({ completions: [done("eve", 60, "2026-10-13T08:00:00Z")], settledAt: SETTLED });
    expect(ofKind(announcerEvents([twoWeeksAgo, thisWeek]), "shutdown")).toEqual([]);
  });
});
