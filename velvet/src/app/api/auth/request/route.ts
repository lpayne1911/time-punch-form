import { NextResponse } from "next/server";
import { z } from "zod";
import { createOtp } from "@/lib/auth";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const code = await createOtp(parsed.data.email);

  // In production the code is delivered by email/SMS and never returned here.
  const isDev = process.env.NODE_ENV !== "production";
  return NextResponse.json({ ok: true, devCode: isDev ? code : undefined });
}
