/**
 * Base URL for server-side calls from the dashboard to the Express API.
 *
 * Prefer INTERNAL_API_URL in Docker (http://api:4000) so we never rely on public DNS
 * from inside the container (.env often sets API_URL to https://api.example.com for the API service).
 */
export function getInternalApiBaseUrl(): string {
  const raw =
    process.env.INTERNAL_API_URL?.trim() ||
    process.env.API_URL?.trim() ||
    "http://localhost:4000"
  return raw.replace(/\/$/, "")
}
