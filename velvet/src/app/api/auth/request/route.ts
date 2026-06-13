import { NextResponse } from "next/server";
import { z } from "zod";
import { createOtp } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/ratelimit";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  // Throttle code requests: per-email (stop inbox spam) and per-IP (stop bulk abuse).
  const perEmail = rateLimit(`otp:req:email:${email}`, 3, 15 * 60_000); // 3 / 15 min
  const perIp = rateLimit(`otp:req:ip:${clientIp(req)}`, 10, 15 * 60_000); // 10 / 15 min
  if (!perEmail.ok || !perIp.ok) {
    const retry = Math.max(perEmail.retryAfterSec, perIp.retryAfterSec);
    return NextResponse.json(
      { error: "Too many requests. Please wait a bit and try again." },
      { status: 429, headers: { "Retry-After": String(retry) } },
    );
  }

  const code = await createOtp(email);

  // In production the code is delivered by email/SMS and never returned here.
  const isDev = process.env.NODE_ENV !== "production";
  return NextResponse.json({ ok: true, devCode: isDev ? code : undefined });
}
