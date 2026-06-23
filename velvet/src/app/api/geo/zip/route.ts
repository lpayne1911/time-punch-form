import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/ratelimit";

/**
 * Resolve a postal code to a GENERAL location ("City, ST") for the location
 * field. Done server-side so both the web and native clients get a uniform
 * result without CORS or API-key handling. We only ever surface a coarse
 * city/region — never a precise address (blueprint §19).
 *
 * Uses the free, key-less Zippopotam.us service. Defaults to US 5-digit ZIPs.
 */
export async function GET(req: Request) {
  if (!rateLimit(`geozip:${clientIp(req)}`, 30, 60_000).ok) {
    return NextResponse.json({ error: "Slow down a moment." }, { status: 429 });
  }

  const url = new URL(req.url);
  const zip = (url.searchParams.get("zip") || "").trim();
  const country = (url.searchParams.get("country") || "us").trim().toLowerCase();

  if (!/^[0-9]{5}$/.test(zip)) {
    return NextResponse.json({ error: "Enter a 5-digit ZIP code." }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.zippopotam.us/${country}/${zip}`, {
      // Coarse, public data — safe to cache at the edge for a day.
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "We couldn't find that ZIP code." }, { status: 404 });
    }
    const data = await res.json();
    const place = data?.places?.[0];
    if (!place) {
      return NextResponse.json({ error: "We couldn't find that ZIP code." }, { status: 404 });
    }
    const city = place["place name"] as string;
    const state = (place["state abbreviation"] || place["state"]) as string;
    const location = state ? `${city}, ${state}` : city;
    return NextResponse.json({ location, city, state });
  } catch {
    return NextResponse.json({ error: "Location lookup is unavailable right now." }, { status: 502 });
  }
}
