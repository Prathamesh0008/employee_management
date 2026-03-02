import { SignJWT, jwtVerify } from "jose";

import { AUTH_COOKIE_NAME, TOKEN_TTL_SECONDS } from "@/lib/constants";

const REMEMBER_ME_TTL_SECONDS = 60 * 60 * 24 * 30;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  return new TextEncoder().encode(secret);
}

export async function signAuthToken(user, { rememberMe = false } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const ttlSeconds = rememberMe ? REMEMBER_ME_TTL_SECONDS : TOKEN_TTL_SECONDS;

  return new SignJWT({
    role: user.role,
    email: user.email,
    name: user.name,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(String(user._id))
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .sign(getJwtSecret());
}

export async function verifyAuthToken(token) {
  const { payload } = await jwtVerify(token, getJwtSecret(), {
    algorithms: ["HS256"],
  });

  return payload;
}

export function authCookieOptions({ rememberMe = false } = {}) {
  return {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: rememberMe ? REMEMBER_ME_TTL_SECONDS : TOKEN_TTL_SECONDS,
  };
}

export { AUTH_COOKIE_NAME };
