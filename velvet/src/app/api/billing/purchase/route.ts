import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { grantPurchase } from "@/lib/purchases";

const schema = z.object({ kind: z.enum(["BOOST", "SUPER_LIKE", "TRAVEL_PASS"]) });

// DEV-ONLY simulated one-time purchase (blueprint §25, §33). On real iOS/Android
// these are consumable products bought through Apple IAP / Google Play Billing;
// a verified webhook grants the credits. Disabled in production.
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Purchases go through the App Store / Google Play." }, { status: 400 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  await grantPurchase(user.id, parsed.data.kind);
  return NextResponse.json({ ok: true });
}
