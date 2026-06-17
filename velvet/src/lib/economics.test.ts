import { describe, it, expect } from "vitest";
import { hostPayoutCents, formatPrice, isValidCategory, PLATFORM_FEE_PCT } from "./events";
import { itemForKind, formatCents } from "./shop";

describe("event economics", () => {
  it("computes host payout net of the platform fee", () => {
    // 10 tickets @ $15.00 = $150.00 gross (15000¢); 15% fee → $127.50 (12750¢)
    expect(hostPayoutCents(1500, 10)).toBe(Math.round(15000 * (1 - PLATFORM_FEE_PCT / 100)));
    expect(hostPayoutCents(1500, 10)).toBe(12750);
  });
  it("formats free vs paid", () => {
    expect(formatPrice(0)).toBe("Free");
    expect(formatPrice(1500)).toBe("$15.00");
  });
  it("only accepts known categories", () => {
    expect(isValidCategory("SOCIAL_MIXER")).toBe(true);
    expect(isValidCategory("EXPLICIT_PARTY")).toBe(false);
  });
});

describe("shop catalog", () => {
  it("resolves known items and rejects unknown", () => {
    expect(itemForKind("BOOST")?.kind).toBe("BOOST");
    expect(itemForKind("NONSENSE")).toBeUndefined();
  });
  it("formats cents", () => {
    expect(formatCents(499)).toBe("$4.99");
  });
});
