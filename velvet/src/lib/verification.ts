import { prisma } from "./db";
import { audit } from "./admin";
import { VerificationType, levelRank, levelForType } from "./verification-levels";

// Server-side verification flow and the provider abstraction (blueprint §17).
// The shape here mirrors how Persona / Veriff / Stripe Identity work: you `start`
// a hosted flow (returning a redirect/client token), the user completes it on the
// provider, and the provider POSTs a signed result to our webhook, which calls
// `applyDecision`. The "dev" provider simulates that round-trip locally.
// Pure level helpers live in ./verification-levels (client-safe).
export type { VerificationType, Level } from "./verification-levels";
export { levelRank, LEVEL_LABELS, levelForType } from "./verification-levels";

export interface VerificationProvider {
  name: string;
  /**
   * Begins a hosted verification. Real providers return a hosted URL (and/or a
   * client token); the dev provider returns a local simulation URL.
   */
  start(checkId: string, type: VerificationType): Promise<{ redirectUrl: string }>;
}

// Dev provider: routes the user to a local page that stands in for the
// provider's hosted flow and then calls our webhook — exercising the exact same
// server path a real provider would.
const devProvider: VerificationProvider = {
  name: "dev",
  async start(checkId) {
    return { redirectUrl: `/verify/simulate/${checkId}` };
  },
};

export function getProvider(): VerificationProvider {
  // In production, select persona/veriff/stripe by env config and verify webhook
  // signatures. Here we always use the local simulation.
  return devProvider;
}

export async function startCheck(userId: string, type: VerificationType) {
  const provider = getProvider();
  const check = await prisma.verificationCheck.create({
    data: { userId, type, provider: provider.name, status: "PENDING", resultLevel: levelForType(type) },
  });
  const { redirectUrl } = await provider.start(check.id, type);
  return { checkId: check.id, redirectUrl };
}

/**
 * Applies a verification decision (from a provider webhook or a manual review)
 * and, on approval, raises the user's trust level if it's an increase. Never
 * downgrades an already-higher level. ID approvals also set provider-backed age
 * assurance.
 */
export async function applyDecision(opts: {
  checkId: string;
  approved: boolean;
  reviewerId?: string;
  externalId?: string;
  note?: string;
}) {
  const check = await prisma.verificationCheck.findUnique({ where: { id: opts.checkId } });
  if (!check || check.status !== "PENDING") return check;

  const updated = await prisma.verificationCheck.update({
    where: { id: opts.checkId },
    data: {
      status: opts.approved ? "APPROVED" : "REJECTED",
      externalId: opts.externalId ?? check.externalId,
      reviewedById: opts.reviewerId ?? null,
      reviewedAt: new Date(),
      note: opts.note ?? null,
      ageVerified: opts.approved && check.type === "ID_DOCUMENT",
    },
  });

  if (opts.approved && check.resultLevel) {
    const user = await prisma.user.findUnique({ where: { id: check.userId } });
    if (user && levelRank(check.resultLevel) > levelRank(user.verification)) {
      await prisma.user.update({
        where: { id: check.userId },
        data: {
          verification: check.resultLevel,
          ...(check.type === "ID_DOCUMENT" ? { ageAssured: true } : {}),
        },
      });
    } else if (user && check.type === "ID_DOCUMENT" && !user.ageAssured) {
      await prisma.user.update({ where: { id: check.userId }, data: { ageAssured: true } });
    }
  }

  if (opts.reviewerId) {
    await audit(
      opts.reviewerId,
      opts.approved ? "VERIFY_APPROVE" : "VERIFY_REJECT",
      check.userId,
      `${check.type}: ${opts.note ?? ""}`,
    );
  }
  return updated;
}
