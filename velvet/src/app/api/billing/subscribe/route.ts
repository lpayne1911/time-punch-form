import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  tier: z.enum(["PLUS", "PREMIUM", "PRIVATE_CIRCLE"]),
  interval: z.enum(["MONTH", "YEAR"]),
});

// DEV-ONLY simulated purchase. On real iOS/Android, the client completes the
// purchase through Apple In-App Purchase / Google Play Billing (via RevenueCat),
// and a verified server-side webhook — NOT this endpoint — grants the
// entitlement (blueprint §33). We never collect card details in-app or route
// around store billing for digital goods. This route exists only to exercise the
// entitlement model locally and is gated to non-production.
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Subscriptions are processed through the App Store / Google Play." },
      { status: 400 },
    );
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const { tier, interval } = parsed.data;

  const days = interval === "YEAR" ? 365 : 30;
  const currentPeriodEnd = new Date(Date.now() + days * 86_400_000);

  await prisma.subscription.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      tier,
      interval,
      status: "ACTIVE",
      provider: "dev",
      currentPeriodEnd,
      cancelAtPeriodEnd: false,
    },
    update: { tier, interval, status: "ACTIVE", provider: "dev", currentPeriodEnd, cancelAtPeriodEnd: false },
  });

  return NextResponse.json({ ok: true, tier, interval });
}
