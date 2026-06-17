"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// Cancel keeps access until the end of the paid period (no clawback) — clear,
// non-punitive, no dark patterns (blueprint §29 cancellation). On real devices,
// management deep-links to the App Store / Play subscription settings.
export async function cancelSubscription() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await prisma.subscription.updateMany({
    where: { userId: user.id, status: "ACTIVE" },
    data: { cancelAtPeriodEnd: true, status: "CANCELED" },
  });
  revalidatePath("/settings");
}

export async function resumeSubscription() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await prisma.subscription.updateMany({
    where: { userId: user.id },
    data: { cancelAtPeriodEnd: false, status: "ACTIVE" },
  });
  revalidatePath("/settings");
}
