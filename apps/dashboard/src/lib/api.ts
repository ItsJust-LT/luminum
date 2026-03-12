import { createApiClient } from "@luminum/api-client";

const API_BASE =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000")
    : (process.env.API_URL || "http://localhost:4000");

export const api = createApiClient(API_BASE);
