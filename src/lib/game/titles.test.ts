import { describe, expect, it } from "vitest";
import { TITLE_MIN_TASKS } from "./config";
import { categoryTitles, isTaskCategory, mainTitleOf, titlesOf, type CategoryCount, type TaskCategory } from "./titles";

/** `count` approved tasks of `category` for `userId`, as one row of the category_counts view. */
const done = (userId: string, category: TaskCategory, count: number): CategoryCount[] => [{ userId, category, count }];

describe("isTaskCategory", () => {
  it("accepts the enum values only", () => {
    expect(isTaskCategory("caffeine")).toBe(true);
    expect(isTaskCategory("random")).toBe(true);
    expect(isTaskCategory("Caffeine addict")).toBe(false);
    expect(isTaskCategory(null)).toBe(false);
    expect(isTaskCategory(3)).toBe(false);
  });
});

describe("categoryTitles", () => {
  it("is empty without completions", () => {
    expect(categoryTitles([])).toEqual([]);
  });

  it("ignores zero counts", () => {
    expect(categoryTitles(done("ana", "gym", 0))).toEqual([]);
  });

  it("gives the title to the player with the most tasks", () => {
    const titles = categoryTitles([...done("ana", "caffeine", 5), ...done("bob", "caffeine", 4)]);
    expect(titles).toEqual([{ category: "caffeine", holderIds: ["ana"], count: 5 }]);
  });

  it(`needs at least ${TITLE_MIN_TASKS} tasks`, () => {
    expect(categoryTitles(done("ana", "gym", TITLE_MIN_TASKS - 1))).toEqual([]);
    expect(categoryTitles(done("ana", "gym", TITLE_MIN_TASKS))).toEqual([
      { category: "gym", holderIds: ["ana"], count: TITLE_MIN_TASKS },
    ]);
  });

  it("shares the title on a tie", () => {
    const titles = categoryTitles([...done("bob", "grind", 4), ...done("ana", "grind", 4), ...done("cid", "grind", 1)]);
    expect(titles).toEqual([{ category: "grind", holderIds: ["ana", "bob"], count: 4 }]);
  });

  it("lists the categories in a fixed order", () => {
    const titles = categoryTitles([...done("ana", "random", 3), ...done("bob", "caffeine", 3), ...done("ana", "gym", 3)]);
    expect(titles.map((title) => title.category)).toEqual(["caffeine", "gym", "random"]);
  });
});

describe("titlesOf / mainTitleOf", () => {
  const titles = categoryTitles([
    ...done("ana", "gym", 3),
    ...done("ana", "chef", 7),
    ...done("ana", "random", 3),
    ...done("bob", "caffeine", 9),
  ]);

  it("returns a player's titles, most tasks first", () => {
    expect(titlesOf("ana", titles).map((title) => title.category)).toEqual(["chef", "gym", "random"]);
    expect(titlesOf("bob", titles).map((title) => title.category)).toEqual(["caffeine"]);
    expect(titlesOf("cid", titles)).toEqual([]);
  });

  it("picks the strongest title for the name badge", () => {
    expect(mainTitleOf("ana", titles)).toBe("chef");
    expect(mainTitleOf("cid", titles)).toBeNull();
  });
});
