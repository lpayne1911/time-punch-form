import { describe, it, expect } from "vitest";
import { parseTags, serializeTags, sanitizeTags, LIFESTYLE_INTERESTS } from "./tags";

describe("tag (de)serialization", () => {
  it("round-trips an array", () => {
    const tags = ["A", "B"];
    expect(parseTags(serializeTags(tags))).toEqual(tags);
  });
  it("dedupes on serialize", () => {
    expect(parseTags(serializeTags(["A", "A", "B"]))).toEqual(["A", "B"]);
  });
  it("returns [] for null/garbage", () => {
    expect(parseTags(null)).toEqual([]);
    expect(parseTags("not json")).toEqual([]);
    expect(parseTags("{}")).toEqual([]);
  });
});

describe("sanitizeTags (controlled vocabulary enforcement)", () => {
  it("keeps only allowed values and drops everything else", () => {
    const allowed = LIFESTYLE_INTERESTS[0];
    const out = sanitizeTags([allowed, "explicit free text", 42, null], LIFESTYLE_INTERESTS);
    expect(out).toEqual([allowed]);
  });
  it("returns [] for non-array input", () => {
    expect(sanitizeTags("nope", LIFESTYLE_INTERESTS)).toEqual([]);
  });
});
