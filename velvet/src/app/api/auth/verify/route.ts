import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyOtp, createSession, onboardingNext } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/ratelimit";

const schema = z.object({ email: z.string().email(), code: z.string().length(6) });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
  }

  const { email, code } = parsed.data;
  const normalized = email.toLowerCase();

  // Brute-force protection: cap verification attempts per email and per IP.
  // Combined with the 10-minute code expiry this makes guessing infeasible.
  const perEmail = rateLimit(`otp:vrf:email:${normalized}`, 5, 15 * 60_000);
  const perIp = rateLimit(`otp:vrf:ip:${clientIp(req)}`, 30, 15 * 60_000);
  if (!perEmail.ok || !perIp.ok) {
    const retry = Math.max(perEmail.retryAfterSec, perIp.retryAfterSec);
    return NextResponse.json(
      { error: "Too many attempts. Please request a new code shortly." },
      { status: 429, headers: { "Retry-After": String(retry) } },
    );
  }

  const ok = await verifyOtp(normalized, code);
  if (!ok) {
    return NextResponse.json({ error: "That code is invalid or expired." }, { status: 401 });
  }

  // Upsert the account on first verified login (passwordless).
  const user = await prisma.user.upsert({
    where: { email: normalized },
    create: { email: normalized, verification: "EMAIL_VERIFIED" },
    update: { verification: "EMAIL_VERIFIED" },
    include: { profile: true },
  });

  if (user.status === "DELETED" || user.deletedAt) {
    return NextResponse.json({ error: "This account has been deleted." }, { status: 403 });
  }
  // Block banned/suspended accounts at sign-in (defense in depth; getCurrentUser also enforces).
  if (user.status === "SUSPENDED" && (!user.suspendedUntil || user.suspendedUntil > new Date())) {
    return NextResponse.json({ error: "This account is not available." }, { status: 403 });
  }

  const token = await createSession(user.id);
  const next = onboardingNext(user) ?? "/discover";
  // Native clients (Expo) identify themselves and receive the session token in
  // the body to store in secure storage. Web clients rely on the httpOnly cookie
  // and never see the token.
  const native = req.headers.get("x-velvet-client") === "native";
  return NextResponse.json({ ok: true, next, token: native ? token : undefined });
}
