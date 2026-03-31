"use client";

import React from "react";
import { assertWebsiteId, normalizeWebsiteId } from "../env/assert-website-id.js";

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
  assertWebsiteId(websiteId, "AnalyticsScript");
  const id = normalizeWebsiteId(websiteId);
  const base = analyticsBaseUrl.replace(/\/$/, "");
  const src = `${base}/script.js?websiteId=${encodeURIComponent(id)}`;

  return (
    <script
      src={src}
      defer
      data-website-id={id}
    />
  );
}
