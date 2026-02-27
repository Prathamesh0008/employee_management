import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authCookieOptions, AUTH_COOKIE_NAME, signAuthToken } from "@/lib/auth";
import {
  enforceRateLimit,
  jsonError,
  normalizeText,
  safeJsonParse,
} from "@/lib/api";
import { createCsrfToken, setCsrfCookie } from "@/lib/csrf";
import connectDB from "@/lib/db";
import User from "@/models/User";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
});

export async function POST(request) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "auth-login",
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const parsed = await safeJsonParse(request);

  if (parsed.error) {
    return parsed.error;
  }

  const validation = loginSchema.safeParse({
    email: normalizeText(parsed.data.email).toLowerCase(),
    password: normalizeText(parsed.data.password),
  });

  if (!validation.success) {
    return jsonError("Invalid login payload", 422, validation.error.flatten());
  }

  const { email, password } = validation.data;

  await connectDB();

  const user = await User.findOne({ email });

  if (!user) {
    return jsonError("Invalid email or password", 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.password);

  if (!passwordMatches) {
    return jsonError("Invalid email or password", 401);
  }

  const token = await signAuthToken(user);

  const response = NextResponse.json(
    {
      message: "Login successful",
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
    { status: 200 },
  );

  response.cookies.set(AUTH_COOKIE_NAME, token, authCookieOptions);
  setCsrfCookie(response, createCsrfToken());

  return response;
}
