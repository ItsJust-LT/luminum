import type { LuminumConfig } from "./types.js";

const DEFAULT_API_BASE_URL = "https://api.luminum.app";
const DEFAULT_ANALYTICS_BASE_URL = "https://analytics.luminum.app";

let globalConfig: LuminumConfig | null = null;

export function initLuminum(config: LuminumConfig): void {
  if (!config.websiteId) {
    throw new Error("[@itsjust-lt/website-kit] websiteId is required");
  }
  globalConfig = {
    websiteId: config.websiteId,
    apiBaseUrl: (config.apiBaseUrl ?? DEFAULT_API_BASE_URL).replace(/\/$/, ""),
    analyticsBaseUrl: (config.analyticsBaseUrl ?? DEFAULT_ANALYTICS_BASE_URL).replace(/\/$/, ""),
  };
}

export function getConfig(): LuminumConfig {
  if (!globalConfig) {
    throw new Error(
      "[@itsjust-lt/website-kit] Not initialized. Call initLuminum({ websiteId }) first."
    );
  }
  return globalConfig;
}

export function getApiBaseUrl(): string {
  return getConfig().apiBaseUrl ?? DEFAULT_API_BASE_URL;
}

export function getAnalyticsBaseUrl(): string {
  return getConfig().analyticsBaseUrl ?? DEFAULT_ANALYTICS_BASE_URL;
}

export function getWebsiteId(): string {
  return getConfig().websiteId;
}
