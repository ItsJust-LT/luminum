/**
 * Node fetch decompresses gzip/deflate bodies but often keeps Content-Encoding on the Response.
 * Forwarding those headers with the decompressed stream causes ERR_CONTENT_DECODING_FAILED in browsers.
 */
const STRIP_FROM_PROXY_RESPONSE = new Set([
  "content-encoding",
  "content-length",
  "transfer-encoding",
])

export function copyProxyResponseHeaders(
  source: Headers,
  target: Headers,
  options?: { skipSetCookie?: boolean },
): void {
  source.forEach((value, key) => {
    const k = key.toLowerCase()
    if (STRIP_FROM_PROXY_RESPONSE.has(k)) return
    if (options?.skipSetCookie && k === "set-cookie") return
    target.set(key, value)
  })
}
