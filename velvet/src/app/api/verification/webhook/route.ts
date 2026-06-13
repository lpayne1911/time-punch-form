import { NextResponse } from "next/server";
import { z } from "zod";
import { applyDecision } from "@/lib/verification";

const schema = z.object({
  checkId: z.string().min(1),
  approved: z.boolean(),
  externalId: z.string().optional(),
});

// Verification provider callback. In production this receives the provider's
// signed payload (Persona/Veriff/Stripe Identity) and MUST verify the signature
// before trusting it. The dev simulation posts here directly and is only allowed
// outside production.
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    // TODO: verify provider webhook signature here before processing.
    return NextResponse.json({ error: "Signature verification required." }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad payload." }, { status: 400 });

  const result = await applyDecision({
    checkId: parsed.data.checkId,
    approved: parsed.data.approved,
    externalId: parsed.data.externalId ?? `dev_${parsed.data.checkId}`,
  });
  if (!result) return NextResponse.json({ error: "Check not found or already resolved." }, { status: 404 });

  return NextResponse.json({ ok: true, status: result.status });
}
