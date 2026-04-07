import type { NextConfig } from "next";

function apiImageRemotePattern(): { protocol: "http" | "https"; hostname: string; pathname: string } | null {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const protocol = u.protocol === "http:" ? "http" : "https";
    return { protocol, hostname: u.hostname, pathname: "/api/public/blog-assets/**" };
  } catch {
    return null;
  }
}

const blogAssetRemote = apiImageRemotePattern();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: blogAssetRemote
    ? {
        remotePatterns: [blogAssetRemote],
      }
    : undefined,
};

export default nextConfig;
