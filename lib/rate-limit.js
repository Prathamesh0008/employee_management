const globalStore = globalThis;

if (!globalStore.__rateLimitStore) {
  globalStore.__rateLimitStore = new Map();
}

export function checkRateLimit({ key, limit, windowMs }) {
  const now = Date.now();
  const existing = globalStore.__rateLimitStore.get(key);

  if (!existing || existing.resetAt <= now) {
    const state = {
      count: 1,
      resetAt: now + windowMs,
    };

    globalStore.__rateLimitStore.set(key, state);

    return {
      allowed: true,
      remaining: Math.max(0, limit - state.count),
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  globalStore.__rateLimitStore.set(key, existing);

  return {
    allowed: true,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}
