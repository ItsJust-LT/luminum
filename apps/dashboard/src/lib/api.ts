import { createApiClient } from "@luminum/api-client";

export const api = createApiClient(
  typeof window !== "undefined"
    ? "" // Client-side: same origin, rewrites handle routing
    : process.env.API_URL || "http://localhost:4000" // Server-side: direct to API
);
