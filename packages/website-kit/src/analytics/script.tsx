"use client";

import React from "react";

export interface AnalyticsScriptProps {
  websiteId: string;
  analyticsBaseUrl?: string;
}

/**
 * Drop-in analytics script tag. Place in your root layout.
 * Loads the Go analytics tracker that handles page views, sessions,
 * and exposes `window.__luminum.getSessionId()`.
 */
export function AnalyticsScript({
  websiteId,
  analyticsBaseUrl = "https://analytics.luminum.app",
}: AnalyticsScriptProps) {
  const base = analyticsBaseUrl.replace(/\/$/, "");
  const src = `${base}/script.js?websiteId=${encodeURIComponent(websiteId)}`;

  return (
    <script
      src={src}
      defer
      data-website-id={websiteId}
    />
  );
}
