import { describe, it, expect } from "vitest";
import { levelRank, levelForType, LEVEL_LABELS } from "./verification-levels";

describe("verification levels", () => {
  it("orders levels low → high", () => {
    expect(levelRank("UNVERIFIED")).toBeLessThan(levelRank("EMAIL_VERIFIED"));
    expect(levelRank("EMAIL_VERIFIED")).toBeLessThan(levelRank("PHOTO_VERIFIED"));
    expect(levelRank("PHOTO_VERIFIED")).toBeLessThan(levelRank("ID_VERIFIED"));
  });
  it("treats unknown levels as 0", () => {
    expect(levelRank("WHATEVER")).toBe(0);
  });
  it("maps check types to the level they grant", () => {
    expect(levelForType("PHOTO_LIVENESS")).toBe("PHOTO_VERIFIED");
    expect(levelForType("ID_DOCUMENT")).toBe("ID_VERIFIED");
  });
  it("has a label for every level", () => {
    for (const l of ["UNVERIFIED", "EMAIL_VERIFIED", "PHOTO_VERIFIED", "ID_VERIFIED"]) {
      expect(LEVEL_LABELS[l]).toBeTruthy();
    }
  });
});
