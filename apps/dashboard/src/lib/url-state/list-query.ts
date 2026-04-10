/**
 * Merge updates into a query string. Pass `null` or `""` to remove a key.
 */
export function mergeSearchParams(
  current: string,
  updates: Record<string, string | null | undefined>
): string {
  const u = new URLSearchParams(current)
  for (const [k, v] of Object.entries(updates)) {
    if (v == null || v === "") u.delete(k)
    else u.set(k, v)
  }
  return u.toString()
}
