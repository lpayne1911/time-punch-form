import { cookies } from "next/headers";
import { randomBytes, randomInt } from "crypto";
import { prisma } from "./db";
import { parseTags } from "./tags";

const SESSION_COOKIE = "velvet_session";
const SESSION_TTL_DAYS = 30;
const OTP_TTL_MINUTES = 10;

export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export async function createOtp(email: string): Promise<string> {
  const code = generateOtp();
  await prisma.otpCode.create({
    data: {
      email: email.toLowerCase(),
      code,
      expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60_000),
    },
  });
  // PRODUCTION: send `code` to the user via an email/SMS provider here.
  // The code is returned to the caller only in development (see route handler).
  return code;
}

export async function verifyOtp(email: string, code: string): Promise<boolean> {
  const normalized = email.toLowerCase();
  const record = await prisma.otpCode.findFirst({
    where: { email: normalized, code, consumed: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return false;
  await prisma.otpCode.update({ where: { id: record.id }, data: { consumed: true } });
  return true;
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000);
  await prisma.session.create({ data: { token, userId, expiresAt } });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
    jar.delete(SESSION_COOKIE);
  }
}

export async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: { include: { profile: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  const u = session.user;
  if (u.status === "DELETED" || u.deletedAt) return null;

  // Enforce moderation state (blueprint §17). A SUSPENDED account is blocked
  // while the suspension is active; a temporary suspension auto-expires (lazy
  // reinstatement). A permanent ban has no end date and stays blocked.
  if (u.status === "SUSPENDED") {
    if (u.suspendedUntil && u.suspendedUntil <= new Date()) {
      await prisma.user.update({ where: { id: u.id }, data: { status: "ACTIVE", suspendedUntil: null } });
      u.status = "ACTIVE";
    } else {
      return null;
    }
  }
  return u;
}

/**
 * A profile has "basics" once it has a display name and at least one relationship
 * intention. This is the minimum to start browsing a limited Discover; the full
 * profile (which sets `completed`) is what makes a member discoverable to others
 * and unlocks messaging.
 */
export function hasBasics(
  profile: { displayName: string | null; intentions: string | null } | null,
): boolean {
  if (!profile) return false;
  return Boolean(profile.displayName) && parseTags(profile.intentions).length > 0;
}

/**
 * Determines where a user should be in the onboarding funnel (blueprint §7, §8).
 * Each gate must be cleared in order. Browsing is allowed once the basics step
 * is done — the full profile is encouraged afterwards, not required up front.
 */
export function onboardingNext(user: {
  ageConfirmed: boolean;
  consentPledgeAcceptedAt: Date | null;
  standardsAcceptedAt: Date | null;
  profile: { displayName: string | null; intentions: string | null } | null;
}): string | null {
  if (!user.ageConfirmed) return "/onboarding/age";
  if (!user.consentPledgeAcceptedAt) return "/onboarding/consent";
  if (!user.standardsAcceptedAt) return "/onboarding/standards";
  if (!hasBasics(user.profile)) return "/onboarding/basics";
  return null; // cleared to browse
}
