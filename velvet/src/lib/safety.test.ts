import { describe, it, expect } from "vitest";
import { moderateText } from "./safety";

describe("moderateText", () => {
  it("treats ordinary respectful text as clean", () => {
    const r = moderateText("I value clear, kind communication and honoring boundaries.");
    expect(r.flagged).toBe(false);
    expect(r.containsContactInfo).toBe(false);
    expect(r.severity).toBe("none");
  });

  it("flags solicitation as high severity (quarantine)", () => {
    for (const t of ["my rates are $200/hr", "pay via cashapp", "generous allowance offered"]) {
      const r = moderateText(t);
      expect(r.flagged, t).toBe(true);
      expect(r.severity, t).toBe("high");
    }
  });

  it("flags threats as high severity", () => {
    const r = moderateText("i will find you or else");
    expect(r.flagged).toBe(true);
    expect(r.severity).toBe("high");
  });

  it("treats bare contact info as low severity (deliver + nudge), not flagged", () => {
    const phone = moderateText("call me at 555-123-4567");
    expect(phone.containsContactInfo).toBe(true);
    expect(phone.flagged).toBe(false);
    expect(phone.severity).toBe("low");

    const email = moderateText("reach me at someone@example.com");
    expect(email.containsContactInfo).toBe(true);
    expect(email.severity).toBe("low");
  });
});
