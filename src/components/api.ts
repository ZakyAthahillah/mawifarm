export function getApiBase() {
  if (process.env.NEXT_PUBLIC_API_BASE) {
    return process.env.NEXT_PUBLIC_API_BASE;
  }

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      const parts = hostname.split(".");
      const rootDomain = parts.length > 2 ? parts.slice(-2).join(".") : hostname;

      return `${protocol}//api.${rootDomain}/api`;
    }

    return `${protocol}//${hostname}:8000/api`;
  }

  return "http://127.0.0.1:8000/api";
}

export const ownerScopeStorageKey = "mawifarm_owner_scope";

export function getJsonHeaders(headers: HeadersInit = {}): HeadersInit {
  return {
    Accept: "application/json",
    ...headers,
  };
}

export function getOwnerScopeHeaders(): HeadersInit {
  if (typeof window === "undefined") {
    return {};
  }

  const ownerId = window.localStorage.getItem(ownerScopeStorageKey);
  return ownerId ? { "X-Owner-Id": ownerId } : {};
}

export async function readJsonResponse<T = unknown>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const text = await response.text();
    const preview = text.trim().slice(0, 80);
    throw new Error(
      preview.startsWith("<!DOCTYPE") || preview.startsWith("<html")
        ? `API mengirim halaman HTML, bukan JSON (${response.status} ${response.url}). Pastikan URL API mengarah ke Laravel.`
        : "API tidak mengirim JSON."
    );
  }

  return response.json() as Promise<T>;
}

export async function readApiError(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      const data = (await response.json()) as { message?: string; detail?: string; error?: string };
      return data.detail || data.message || data.error || `Request gagal (${response.status})`;
    } catch {
      return `Request gagal (${response.status})`;
    }
  }

  try {
    const text = await response.text();
    const preview = text.trim().slice(0, 120);
    if (preview) {
      return preview;
    }
  } catch {
    // ignore
  }

  return `Request gagal (${response.status})`;
}
