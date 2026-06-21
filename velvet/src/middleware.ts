import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Cross-origin access for the installable WEB build of the native app, which is
// served from a different origin and authenticates with a Bearer token — never
// cookies. A permissive Allow-Origin is safe precisely because these endpoints
// don't rely on cookies: no credentials are sent cross-origin, so this can't be
// abused for CSRF against a signed-in browser session. Set MOBILE_WEB_ORIGIN to
// lock it to a specific origin if you prefer.
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": process.env.MOBILE_WEB_ORIGIN || "*",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, x-velvet-client",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
};

export function middleware(req: NextRequest) {
  // Answer CORS preflight directly.
  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  }
  const res = NextResponse.next();
  for (const [key, value] of Object.entries(CORS_HEADERS)) res.headers.set(key, value);
  return res;
}

// Only the JSON API needs CORS — the web pages stay same-origin.
export const config = { matcher: "/api/:path*" };
