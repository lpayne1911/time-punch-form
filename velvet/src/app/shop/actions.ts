"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { activateBoost, activateTravelPass } from "@/lib/purchases";

export async function activateBoostAction() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await activateBoost(user.id); // no-op if no credit
  revalidatePath("/shop");
  revalidatePath("/discover");
}

export async function activateTravelAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const location = String(formData.get("location") ?? "").trim().slice(0, 60);
  if (location) await activateTravelPass(user.id, location);
  revalidatePath("/shop");
}
