import { createApiClient, type ApiClient } from "@luminum/api-client";

const API_BASE =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000")
    : (process.env.API_URL || "http://localhost:4000");

export const api: ApiClient = createApiClient(API_BASE);
