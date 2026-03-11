import type { NextConfig } from "next";

const API_URL = process.env.API_URL || "http://localhost:4000";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        // Proxy non-analytics API routes to Express API server
        { source: "/api/auth/:path*", destination: `${API_URL}/api/auth/:path*` },
        { source: "/api/me", destination: `${API_URL}/api/me` },
        { source: "/api/health", destination: `${API_URL}/api/health` },
        { source: "/api/emails/:path*", destination: `${API_URL}/api/emails/:path*` },
        { source: "/api/forms/:path*", destination: `${API_URL}/api/forms/:path*` },
        { source: "/api/organization-settings/:path*", destination: `${API_URL}/api/organization-settings/:path*` },
        { source: "/api/organization-actions/:path*", destination: `${API_URL}/api/organization-actions/:path*` },
        { source: "/api/organization-management/:path*", destination: `${API_URL}/api/organization-management/:path*` },
        { source: "/api/admin/:path*", destination: `${API_URL}/api/admin/:path*` },
        { source: "/api/paystack/:path*", destination: `${API_URL}/api/paystack/:path*` },
        { source: "/api/support/:path*", destination: `${API_URL}/api/support/:path*` },
        { source: "/api/user-notifications/:path*", destination: `${API_URL}/api/user-notifications/:path*` },
        { source: "/api/notification-preferences/:path*", destination: `${API_URL}/api/notification-preferences/:path*` },
        { source: "/api/notifications", destination: `${API_URL}/api/notifications` },
        { source: "/api/webhook/emails/:path*", destination: `${API_URL}/api/webhook/emails/:path*` },
        { source: "/api/images/:path*", destination: `${API_URL}/api/images/:path*` },
        { source: "/api/uploads/:path*", destination: `${API_URL}/api/uploads/:path*` },
        { source: "/api/avatar/:path*", destination: `${API_URL}/api/avatar/:path*` },
        { source: "/api/websites/:path*", destination: `${API_URL}/api/websites/:path*` },
        { source: "/api/members/:path*", destination: `${API_URL}/api/members/:path*` },
        { source: "/api/subscriptions/:path*", destination: `${API_URL}/api/subscriptions/:path*` },
        { source: "/api/user-management/:path*", destination: `${API_URL}/api/user-management/:path*` },
        { source: "/api/analytics/:path*", destination: `${API_URL}/api/analytics/:path*` },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-eval'; connect-src 'self' https:; img-src 'self' data: https:;",
          },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          { key: "Content-Type", value: "application/manifest+json" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/icon-:size.png",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
  experimental: {},
  poweredByHeader: false,
  generateEtags: false,
  compress: true,
  env: { CUSTOM_KEY: process.env.CUSTOM_KEY },
  images: {
    formats: ["image/webp", "image/avif"],
    minimumCacheTTL: 60,
  },
};

export default nextConfig;
