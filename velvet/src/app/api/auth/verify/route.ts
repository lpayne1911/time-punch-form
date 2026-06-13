import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyOtp, createSession, onboardingNext } from "@/lib/auth";

const schema = z.object({ email: z.string().email(), code: z.string().length(6) });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
  }

  const { email, code } = parsed.data;
  const ok = await verifyOtp(email, code);
  if (!ok) {
    return NextResponse.json({ error: "That code is invalid or expired." }, { status: 401 });
  }

  // Upsert the account on first verified login (passwordless).
  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    create: { email: email.toLowerCase(), verification: "EMAIL_VERIFIED" },
    update: { verification: "EMAIL_VERIFIED" },
    include: { profile: true },
  });

  if (user.status === "DELETED" || user.deletedAt) {
    return NextResponse.json({ error: "This account has been deleted." }, { status: 403 });
  }

  await createSession(user.id);
  const next = onboardingNext(user) ?? "/discover";
  return NextResponse.json({ ok: true, next });
}
