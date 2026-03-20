const COOKIE_NAME = "__luminum_sid";

/**
 * Read the Luminum session ID from the `__luminum_sid` cookie.
 * Returns `null` if the cookie isn't set (e.g. script hasn't loaded yet).
 * This is a client-side function — call it from a Client Component or event handler.
 */
export function getSessionId(): string | null {
  if (typeof document === "undefined") return null;
  const cookie = document.cookie || "";
  const idx = cookie.indexOf(`${COOKIE_NAME}=`);
  if (idx === -1) return null;
  const start = idx + COOKIE_NAME.length + 1;
  const end = cookie.indexOf(";", start);
  const value = (end === -1 ? cookie.slice(start) : cookie.slice(start, end)).trim();
  try {
    return value ? decodeURIComponent(value) : null;
  } catch {
    return null;
  }
}
