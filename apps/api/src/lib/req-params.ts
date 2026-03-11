import type { Request } from "express";

/**
 * Reads a single query parameter as a string.
 * Uses the first value when the parameter is sent as an array.
 */
export function getQueryParam(req: Request, key: string): string | undefined {
  const v = req.query[key];
  const raw = Array.isArray(v) ? v[0] : v;
  return typeof raw === "string" ? raw : undefined;
}

/**
 * Reads a single path parameter as a string.
 * Uses the first value when the parameter is sent as an array.
 */
export function getPathParam(req: Request, key: string): string | undefined {
  const v = req.params[key];
  if (Array.isArray(v)) return v[0];
  return typeof v === "string" ? v : undefined;
}

/** @deprecated Use getQueryParam. */
export const queryParam = getQueryParam;

/** @deprecated Use getPathParam. */
export const pathParam = getPathParam;
