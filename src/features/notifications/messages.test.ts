import { describe, expect, it } from "vitest";
import { newCommentMessage, newPostMessage, newProofMessage, QUOTE_MAX_LENGTH } from "./messages";

describe("newPostMessage", () => {
  it("quotes the caption under the author's name", () => {
    expect(newPostMessage({ postId: "p1", authorName: "Velja", caption: "Noge danas" })).toEqual({
      title: "Velja",
      body: "Nova objava: „Noge danas“",
      url: "/feed",
      tag: "post-p1",
    });
  });

  it("has a plain text without a caption", () => {
    expect(newPostMessage({ postId: "p1", authorName: "Velja", caption: null }).body).toBe("Nova objava u feedu");
    expect(newPostMessage({ postId: "p1", authorName: "Velja", caption: "  " }).body).toBe("Nova objava u feedu");
  });

  it("puts a long caption on one line and cuts it", () => {
    const caption = `Prvi red\n\n${"a".repeat(200)}`;
    const { body } = newPostMessage({ postId: "p1", authorName: "Velja", caption });
    const quoted = body.slice(body.indexOf("„") + 1, -1);
    expect(quoted).toHaveLength(QUOTE_MAX_LENGTH);
    expect(quoted.startsWith("Prvi red a")).toBe(true);
    expect(quoted.endsWith("…")).toBe(true);
  });
});

describe("newProofMessage", () => {
  it("asks for a vote on the task", () => {
    expect(newProofMessage({ completionId: "c1", authorName: "Kivi", taskTitle: "Teretana" })).toEqual({
      title: "Kivi",
      body: "Dokaz čeka tvoj glas: „Teretana“",
      url: "/feed",
      tag: "proof-c1",
    });
  });
});

describe("newCommentMessage", () => {
  it("shares one tag per post", () => {
    const first = newCommentMessage({ postId: "p1", authorName: "Kivi", comment: "Legenda" });
    const second = newCommentMessage({ postId: "p1", authorName: "Luka", comment: "Cap" });
    expect(first.body).toBe("Komentar na tvoju objavu: „Legenda“");
    expect(first.tag).toBe(second.tag);
  });
});
