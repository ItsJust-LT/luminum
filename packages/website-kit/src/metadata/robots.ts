export interface RobotsConfig {
  rules: {
    userAgent: string | string[];
    allow?: string | string[];
    disallow?: string | string[];
  }[];
  sitemap?: string | string[];
}

/**
 * Generate a robots.txt config for your Next.js site with blog routes allowed.
 * Use this in your `app/robots.ts`.
 *
 * @example
 * ```ts
 * // app/robots.ts
 * import { getRobotsConfig } from "@luminum/website-kit/metadata";
 *
 * export default function robots() {
 *   return getRobotsConfig({ baseUrl: "https://yoursite.com" });
 * }
 * ```
 */
export function getRobotsConfig(opts: {
  baseUrl: string;
  /** Additional paths to disallow. Defaults to none. */
  disallow?: string[];
}): RobotsConfig {
  const base = opts.baseUrl.replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: opts.disallow ?? [],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
