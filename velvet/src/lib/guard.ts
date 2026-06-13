import { redirect } from "next/navigation";
import { getCurrentUser, onboardingNext } from "./auth";

/**
 * Use at the top of any member-only page. Redirects to login if signed out,
 * or back into the onboarding funnel if any gate is incomplete. Returns the
 * fully-onboarded user otherwise.
 */
export async function requireOnboarded() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const next = onboardingNext(user);
  if (next) redirect(next);
  return user;
}
