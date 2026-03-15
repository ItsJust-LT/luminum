/**
 * JSON.stringify replacer that converts BigInt to string.
 * Use when serializing Prisma results that may contain BigInt fields.
 */
export function jsonStringifySafe(obj: unknown): string {
  return JSON.stringify(obj, (_key, value) =>
    typeof value === "bigint" ? value.toString() : value
  );
}
