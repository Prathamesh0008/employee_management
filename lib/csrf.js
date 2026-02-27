import { randomBytes } from "crypto";

import { CSRF_COOKIE_NAME } from "@/lib/constants";

export function createCsrfToken() {
  return randomBytes(32).toString("hex");
}

export function setCsrfCookie(response, token) {
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export function clearCsrfCookie(response) {
  response.cookies.set(CSRF_COOKIE_NAME, "", {
    httpOnly: false,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
