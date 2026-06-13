"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { applyDecision } from "@/lib/verification";

// DEV-ONLY: stands in for a provider completing its hosted flow. Runs server-side
// and authorizes that the signed-in user owns the check, so the public
// /api/verification/webhook can require a real provider signature in all
// environments. Disabled in production.
export async function simulateDecision(checkId: string, approved: boolean) {
  if (process.env.NODE_ENV === "production") redirect("/verify");
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const check = await prisma.verificationCheck.findUnique({ where: { id: checkId } });
  if (!check || check.userId !== user.id) redirect("/verify");

  await applyDecision({ checkId, approved, externalId: `dev_${checkId}` });
  redirect("/verify");
}
