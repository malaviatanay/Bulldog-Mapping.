import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

// Baseline security headers. These are deliberately conservative — they don't
// add a CSP because Mapbox GL needs WebGL, blob workers, and inline styles
// that a strict CSP would break. The headers below are safe to ship as-is.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Restrict powerful APIs the app does not need
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), geolocation=(self)",
  },
  // HSTS — only takes effect over HTTPS, ignored on localhost/HTTP
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withPWA({
  dest: "public",
  register: true,
  disable: process.env.NODE_ENV === "development",
})(nextConfig);
