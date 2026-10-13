import { describe, expect, it } from "vitest";
import { PROOF_APPROVALS_NEEDED, PROOF_REJECTIONS_NEEDED } from "./config";
import { countProofVotes, resolveProof } from "./proofs";

describe("proof rules", () => {
  it("needs 2 Legit to approve and 3 Cap (a majority of the other 4) to reject", () => {
    expect(PROOF_APPROVALS_NEEDED).toBe(2);
    expect(PROOF_REJECTIONS_NEEDED).toBe(3);
  });
});

describe("resolveProof", () => {
  it("stays pending without enough votes", () => {
    expect(resolveProof({ legit: 0, cap: 0 })).toBe("pending");
    expect(resolveProof({ legit: 1, cap: 2 })).toBe("pending");
  });

  it("approves with 2 Legit, even with Cap votes", () => {
    expect(resolveProof({ legit: 2, cap: 0 })).toBe("approved");
    expect(resolveProof({ legit: 2, cap: 2 })).toBe("approved");
  });

  it("rejects with 3 Cap", () => {
    expect(resolveProof({ legit: 1, cap: 3 })).toBe("rejected");
  });
});

describe("countProofVotes", () => {
  it("counts each side", () => {
    expect(countProofVotes([{ vote: "legit" }, { vote: "cap" }, { vote: "legit" }])).toEqual({ legit: 2, cap: 1 });
    expect(countProofVotes([])).toEqual({ legit: 0, cap: 0 });
  });
});
