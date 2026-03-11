import { cookies } from "next/headers";

const API_URL = process.env.API_URL || "http://localhost:4000";

export async function serverFetch<T = any>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      cookie: cookieHeader,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  const text = await res.text();
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = text ? JSON.parse(text) : null;
      if (body?.error) message = body.error;
      else if (body?.message) message = body.message;
    } catch {
      if (text) message = text.slice(0, 200);
    }
    throw new Error(message || `API ${res.status}`);
  }

  try {
    return (text ? JSON.parse(text) : null) as T;
  } catch {
    throw new Error("Invalid JSON response");
  }
}

export function serverGet<T = any>(
  path: string,
  params?: Record<string, any>
) {
  const qs = params
    ? "?" +
      new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== null)
          .map(([k, v]) => [k, String(v)])
      ).toString()
    : "";
  return serverFetch<T>(`${path}${qs}`);
}

export function serverPost<T = any>(path: string, body?: any) {
  return serverFetch<T>(path, {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function serverPatch<T = any>(path: string, body?: any) {
  return serverFetch<T>(path, {
    method: "PATCH",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function serverDelete<T = any>(path: string, body?: any) {
  return serverFetch<T>(path, {
    method: "DELETE",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}
