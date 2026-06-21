import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getEntitlements, getSubscription, likesRemainingToday } from "@/lib/entitlements";
import { TIERS, annualSavingsPct } from "@/lib/billing";
import { SHOP_ITEMS } from "@/lib/shop";

/**
 * Premium / add-ons module data for the native client: the viewer's current
 * entitlements, the subscription tiers, and the à-la-carte catalog. Purchases
 * themselves go through the existing /api/billing/subscribe and
 * /api/billing/purchase routes (which, in production, defer to Apple IAP /
 * Google Play Billing — never card collection in-app, blueprint §33).
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const ent = await getEntitlements(user.id);
  const sub = await getSubscription(user.id);
  const remaining = await likesRemainingToday(user.id);

  return NextResponse.json({
    tier: ent.tier,
    isPaid: ent.isPaid,
    features: Array.from(ent.features),
    likesRemaining: remaining,
    subscription: sub
      ? {
          tier: sub.tier,
          status: sub.status,
          currentPeriodEnd: sub.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : null,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        }
      : null,
    tiers: TIERS.map((t) => ({
      id: t.id,
      name: t.name,
      monthly: t.monthly,
      annual: t.annual,
      blurb: t.blurb,
      forWho: t.forWho,
      features: t.features,
      annualSavingsPct: annualSavingsPct(t.id),
    })),
    shop: SHOP_ITEMS,
  });
}
