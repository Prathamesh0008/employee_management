function getCookieValue(name) {
  if (typeof document === "undefined") {
    return "";
  }

  const cookies = document.cookie.split(";");
  const target = `${name}=`;

  for (const item of cookies) {
    const trimmed = item.trim();

    if (trimmed.startsWith(target)) {
      return decodeURIComponent(trimmed.slice(target.length));
    }
  }

  return "";
}

export async function apiFetch(url, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers || {});

  if (["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
    const csrfToken = getCookieValue("csrf_token");

    if (csrfToken && !headers.has("x-csrf-token")) {
      headers.set("x-csrf-token", csrfToken);
    }
  }

  return fetch(url, {
    ...options,
    method,
    headers,
  });
}
