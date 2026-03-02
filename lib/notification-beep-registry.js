"use client";

const STORAGE_KEY = "ems:notification-beep-registry";
const ENTRY_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_ENTRIES = 200;

let channel = null;

function isBrowser() {
  return typeof window !== "undefined";
}

function getChannel() {
  if (!isBrowser() || typeof BroadcastChannel === "undefined") {
    return null;
  }

  if (!channel) {
    channel = new BroadcastChannel("ems-notification-beeps");
  }

  return channel;
}

function pruneEntries(registry) {
  const now = Date.now();
  const entries = Object.entries(registry)
    .filter(([, timestamp]) => Number.isFinite(timestamp) && now - timestamp < ENTRY_TTL_MS)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_ENTRIES);

  return Object.fromEntries(entries);
}

function readRegistry() {
  if (!isBrowser()) {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return pruneEntries(parsed);
  } catch {
    return {};
  }
}

function writeRegistry(registry) {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pruneEntries(registry)));
  } catch {
    // Ignore storage failures.
  }
}

export function prepareNotificationBeepRegistry() {
  if (!isBrowser()) {
    return;
  }

  const activeChannel = getChannel();

  if (activeChannel && !activeChannel.onmessage) {
    activeChannel.onmessage = (event) => {
      const ids = Array.isArray(event.data?.ids) ? event.data.ids : [];

      if (ids.length === 0) {
        return;
      }

      const registry = readRegistry();
      const now = Date.now();

      ids.forEach((id) => {
        registry[String(id)] = now;
      });

      writeRegistry(registry);
    };
  }
}

export function claimNotificationBeeps(notificationIds = []) {
  if (!isBrowser() || !Array.isArray(notificationIds) || notificationIds.length === 0) {
    return [];
  }

  const registry = readRegistry();
  const now = Date.now();
  const claimedIds = [];

  notificationIds.forEach((id) => {
    const key = String(id);

    if (!registry[key]) {
      registry[key] = now;
      claimedIds.push(key);
    }
  });

  if (claimedIds.length === 0) {
    return [];
  }

  writeRegistry(registry);
  getChannel()?.postMessage({ ids: claimedIds });

  return claimedIds;
}
