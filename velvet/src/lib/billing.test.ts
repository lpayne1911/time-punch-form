import { describe, it, expect } from "vitest";
import {
  effectiveTier,
  featuresFor,
  hasFeature,
  tierForFeature,
  price,
  annualSavingsPct,
  type ActiveSub,
} from "./billing";

const sub = (over: Partial<NonNullable<ActiveSub>> = {}): ActiveSub => ({
  tier: "PREMIUM",
  status: "ACTIVE",
  currentPeriodEnd: new Date(Date.now() + 86_400_000),
  cancelAtPeriodEnd: false,
  ...over,
});

describe("effectiveTier", () => {
  it("returns FREE for no subscription", () => {
    expect(effectiveTier(null)).toBe("FREE");
  });
  it("returns the tier while the period is active", () => {
    expect(effectiveTier(sub())).toBe("PREMIUM");
  });
  it("falls back to FREE once the period has ended (even if not canceled)", () => {
    expect(effectiveTier(sub({ currentPeriodEnd: new Date(Date.now() - 1000) }))).toBe("FREE");
  });
});

describe("featuresFor (cumulative)", () => {
  it("FREE has no premium features", () => {
    expect(featuresFor("FREE").size).toBe(0);
  });
  it("PREMIUM includes PLUS features plus its own", () => {
    const f = featuresFor("PREMIUM");
    expect(f.has("unlimitedLikes")).toBe(true); // from PLUS
    expect(f.has("incognito")).toBe(true); // from PREMIUM
    expect(f.has("privateCircles")).toBe(false); // Private Circle only
  });
  it("PRIVATE_CIRCLE is a superset", () => {
    const f = featuresFor("PRIVATE_CIRCLE");
    expect(f.has("unlimitedLikes")).toBe(true);
    expect(f.has("incognito")).toBe(true);
    expect(f.has("privateCircles")).toBe(true);
  });
});

describe("hasFeature / tierForFeature", () => {
  it("gates incognito to a paid, active PREMIUM sub", () => {
    expect(hasFeature(sub(), "incognito")).toBe(true);
    expect(hasFeature(null, "incognito")).toBe(false);
    expect(hasFeature(sub({ tier: "PLUS" }), "incognito")).toBe(false);
  });
  it("maps features to the lowest unlocking tier", () => {
    expect(tierForFeature("unlimitedLikes")).toBe("PLUS");
    expect(tierForFeature("incognito")).toBe("PREMIUM");
    expect(tierForFeature("privateCircles")).toBe("PRIVATE_CIRCLE");
  });
});

describe("pricing", () => {
  it("annual is cheaper per-year than monthly*12", () => {
    expect(price("PLUS", "YEAR")).toBeLessThan(price("PLUS", "MONTH") * 12);
    expect(annualSavingsPct("PLUS")).toBeGreaterThan(0);
  });
  it("FREE costs nothing and has no savings", () => {
    expect(price("FREE", "MONTH")).toBe(0);
    expect(annualSavingsPct("FREE")).toBe(0);
  });
});
