import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCandidates } from "@/lib/matching";
import { rateLimit } from "@/lib/ratelimit";

/**
 * Ranked, compatibility-based Discover deck as JSON for the native client.
 * Reuses the exact same matching/visibility logic as the web app — this is a
 * thin transport over `getCandidates`, so the swipe deck and the web Discover
 * page can never drift apart.
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  if (!rateLimit(`discover:${user.id}`, 60, 60_000).ok) {
    return NextResponse.json({ error: "Slow down a moment." }, { status: 429 });
  }

  const url = new URL(req.url);
  const intention = url.searchParams.get("intention") || undefined;
  const experience = url.searchParams.get("experience") || undefined;
  const verifiedOnly = url.searchParams.get("verifiedOnly") === "1" || undefined;

  const candidates = await getCandidates(user.id, 20, { intention, experience, verifiedOnly });
  return NextResponse.json({ candidates });
}
