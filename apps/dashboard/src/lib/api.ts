import { createApiClient, type ApiClient } from "@luminum/api-client";

const API_BASE =
  typeof window !== "undefined"
    ? "/api/proxy"
    : (process.env.API_URL || "http://localhost:4000");

// Ensure get/post/patch/del and analytics are in the type so CI (Docker) type-check passes when package return type is inferred incompletely
type ApiWithLowLevel = ApiClient & {
  get: (path: string, params?: Record<string, unknown>) => Promise<unknown>;
  post: (path: string, body?: unknown) => Promise<unknown>;
  patch: (path: string, body?: unknown) => Promise<unknown>;
  del: (path: string, body?: unknown) => Promise<unknown>;
  analytics: Record<string, (...args: unknown[]) => Promise<unknown>>;
};
export const api: ApiWithLowLevel = createApiClient(API_BASE) as ApiWithLowLevel;
