import { NextResponse } from "next/server";
import { z } from "zod";
import { applyDecision } from "@/lib/verification";
import { verifySignature } from "@/lib/webhooks";

const schema = z.object({
  checkId: z.string().min(1),
  approved: z.boolean(),
  externalId: z.string().optional(),
});

// Real verification-provider callback (Persona/Veriff/Stripe Identity). The
// provider signs the raw body; we require a valid HMAC signature before trusting
// it. The local dev simulation does NOT use this endpoint — it goes through an
// authenticated server action (see /verify/simulate) — so this path can stay
// strict in every environment.
export async function POST(req: Request) {
  const secret = process.env.VERIFICATION_WEBHOOK_SECRET;
  if (!secret) {
    // No provider configured. Refuse rather than trust unauthenticated input.
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const raw = await req.text();
  const signature = req.headers.get("x-velvet-signature") ?? req.headers.get("x-signature");
  if (!verifySignature(raw, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const parsed = schema.safeParse(JSON.parse(raw || "{}"));
  if (!parsed.success) return NextResponse.json({ error: "Bad payload." }, { status: 400 });

  const result = await applyDecision({
    checkId: parsed.data.checkId,
    approved: parsed.data.approved,
    externalId: parsed.data.externalId,
  });
  if (!result) return NextResponse.json({ error: "Check not found or already resolved." }, { status: 404 });

  return NextResponse.json({ ok: true, status: result.status });
}
