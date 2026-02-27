import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, ROLE_VALUES } from "@/lib/constants";
import { verifyAuthToken } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import connectDB from "@/lib/db";
import User from "@/models/User";

export function jsonError(message, status = 400, details) {
  return NextResponse.json(
    {
      error: message,
      ...(details ? { details } : {}),
    },
    { status },
  );
}

export async function safeJsonParse(request) {
  try {
    return { data: await request.json() };
  } catch {
    return { error: jsonError("Invalid JSON request body", 400) };
  }
}

export function normalizeText(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

export function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

export function parseDateOnly(value) {
  const cleaned = normalizeText(value);

  if (!cleaned) {
    return null;
  }

  const parsed = new Date(cleaned);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Date(
    Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()),
  );
}

export function getPagination(searchParams, defaults = {}) {
  const defaultLimit = defaults.defaultLimit || 20;
  const maxLimit = defaults.maxLimit || 100;

  const page = Math.max(
    1,
    Number.parseInt(normalizeText(searchParams?.get?.("page")) || "1", 10) || 1,
  );
  const requestedLimit =
    Number.parseInt(normalizeText(searchParams?.get?.("limit")) || String(defaultLimit), 10) ||
    defaultLimit;
  const limit = Math.max(1, Math.min(maxLimit, requestedLimit));

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

export function getRequestIdentifier(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0]?.trim() || realIp || "unknown";

  return ip;
}

export function enforceRateLimit(request, { keyPrefix, limit, windowMs, identifier = "" }) {
  const fallbackIdentifier = getRequestIdentifier(request);
  const key = `${keyPrefix}:${identifier || fallbackIdentifier}`;
  const result = checkRateLimit({ key, limit, windowMs });

  if (result.allowed) {
    return null;
  }

  return NextResponse.json(
    {
      error: "Too many requests. Please try again later.",
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
      },
    },
  );
}

export async function requireApiAuth(request, allowedRoles = ROLE_VALUES) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return { error: jsonError("Authentication required", 401) };
  }

  let payload;

  try {
    payload = await verifyAuthToken(token);
  } catch {
    return { error: jsonError("Session is invalid or expired", 401) };
  }

  await connectDB();

  const user = await User.findById(payload.sub).select("-password").lean();

  if (!user) {
    return { error: jsonError("Authenticated user was not found", 401) };
  }

  if (!allowedRoles.includes(user.role)) {
    return { error: jsonError("Forbidden", 403) };
  }

  return { user };
}
