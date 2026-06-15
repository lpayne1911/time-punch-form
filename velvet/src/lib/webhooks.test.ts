import { describe, it, expect } from "vitest";
import { computeSignature, verifySignature } from "./webhooks";

const secret = "testsecret123";
const body = JSON.stringify({ checkId: "abc", approved: true });

describe("verifySignature", () => {
  it("accepts a correct signature", () => {
    expect(verifySignature(body, computeSignature(body, secret), secret)).toBe(true);
  });
  it("accepts the sha256= prefixed form", () => {
    expect(verifySignature(body, "sha256=" + computeSignature(body, secret), secret)).toBe(true);
  });
  it("rejects a missing signature", () => {
    expect(verifySignature(body, null, secret)).toBe(false);
  });
  it("rejects garbage", () => {
    expect(verifySignature(body, "deadbeef", secret)).toBe(false);
  });
  it("rejects a signature made with the wrong secret", () => {
    expect(verifySignature(body, computeSignature(body, "other"), secret)).toBe(false);
  });
  it("rejects a tampered body", () => {
    const sig = computeSignature(body, secret);
    expect(verifySignature(body + "x", sig, secret)).toBe(false);
  });
});
