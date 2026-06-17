import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Security headers (blueprint §19, §40). A nonce-based strict script CSP is the
// production follow-up; this baseline already blocks framing/clickjacking, MIME
// sniffing, referrer leakage, and (in prod) enforces HTTPS.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // No public indexing of member content (blueprint §19).
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
