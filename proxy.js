import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

import {
  AUTH_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  DASHBOARD_BY_ROLE,
  ROLES,
} from "@/lib/constants";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return null;
  }

  return new TextEncoder().encode(secret);
}

async function getTokenPayload(request) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const secret = getJwtSecret();

  if (!secret) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    return payload;
  } catch {
    return null;
  }
}

function redirectToLogin(request) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);

  return NextResponse.redirect(loginUrl);
}

function jsonForbidden(message, status) {
  return NextResponse.json({ error: message }, { status });
}

function roleForPath(pathname) {
  if (pathname.startsWith("/boss")) {
    return ROLES.BOSS;
  }

  if (pathname.startsWith("/manager")) {
    return ROLES.MANAGER;
  }

  if (pathname.startsWith("/employee")) {
    return ROLES.EMPLOYEE;
  }

  return null;
}

function requiresCsrf(pathname, method) {
  const isWrite = ["POST", "PATCH", "PUT", "DELETE"].includes(method);

  if (!isWrite) {
    return false;
  }

  if (!pathname.startsWith("/api/")) {
    return false;
  }

  if (pathname === "/api/auth/login") {
    return false;
  }

  return true;
}

function verifyCsrf(request) {
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get("x-csrf-token");

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return false;
  }

  return true;
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const payload = await getTokenPayload(request);
  const role = payload?.role;

  if (pathname === "/login") {
    if (role && DASHBOARD_BY_ROLE[role]) {
      return NextResponse.redirect(new URL(DASHBOARD_BY_ROLE[role], request.url));
    }

    return NextResponse.next();
  }

  const pageRole = roleForPath(pathname);

  if (pageRole) {
    if (!role) {
      return redirectToLogin(request);
    }

    if (role !== pageRole) {
      return NextResponse.redirect(new URL(DASHBOARD_BY_ROLE[role], request.url));
    }

    return NextResponse.next();
  }

  if (requiresCsrf(pathname, request.method)) {
    if (!verifyCsrf(request)) {
      return jsonForbidden("Invalid CSRF token", 403);
    }
  }

  if (pathname.startsWith("/api/auth/me")) {
    if (!role) {
      return jsonForbidden("Authentication required", 401);
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/api/users")) {
    if (!role) {
      return jsonForbidden("Authentication required", 401);
    }

    if (request.method === "GET" && ![ROLES.BOSS, ROLES.MANAGER].includes(role)) {
      return jsonForbidden("Forbidden", 403);
    }

    if (request.method === "POST" && role !== ROLES.BOSS) {
      return jsonForbidden("Forbidden", 403);
    }

    if (
      request.method === "PATCH" &&
      pathname.startsWith("/api/users/") &&
      ![ROLES.BOSS, ROLES.MANAGER].includes(role)
    ) {
      return jsonForbidden("Forbidden", 403);
    }

    if (!["GET", "POST", "PATCH"].includes(request.method) && role !== ROLES.BOSS) {
      return jsonForbidden("Forbidden", 403);
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/api/tasks")) {
    if (!role) {
      return jsonForbidden("Authentication required", 401);
    }

    if (request.method === "POST" && role !== ROLES.MANAGER) {
      return jsonForbidden("Forbidden", 403);
    }

    if (request.method === "PATCH" && role !== ROLES.EMPLOYEE) {
      return jsonForbidden("Forbidden", 403);
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/api/holidays")) {
    if (!role) {
      return jsonForbidden("Authentication required", 401);
    }

    if (request.method !== "GET" && role !== ROLES.BOSS) {
      return jsonForbidden("Forbidden", 403);
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/api/attendance")) {
    if (!role) {
      return jsonForbidden("Authentication required", 401);
    }

    if (request.method === "POST" && role !== ROLES.EMPLOYEE) {
      return jsonForbidden("Forbidden", 403);
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/api/breaks")) {
    if (!role) {
      return jsonForbidden("Authentication required", 401);
    }

    if (request.method === "POST" && role !== ROLES.EMPLOYEE) {
      return jsonForbidden("Forbidden", 403);
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/api/leaves")) {
    if (!role) {
      return jsonForbidden("Authentication required", 401);
    }

    if (request.method === "POST") {
      if (pathname.startsWith("/api/leaves/policy") || pathname.startsWith("/api/leaves/encash")) {
        if (role !== ROLES.MANAGER) {
          return jsonForbidden("Forbidden", 403);
        }
      } else if (role !== ROLES.EMPLOYEE) {
        return jsonForbidden("Forbidden", 403);
      }
    }

    if (request.method === "PATCH") {
      if (pathname.startsWith("/api/leaves/balance")) {
        if (role !== ROLES.MANAGER) {
          return jsonForbidden("Forbidden", 403);
        }
      } else if (![ROLES.EMPLOYEE, ROLES.MANAGER].includes(role)) {
        return jsonForbidden("Forbidden", 403);
      }
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/api/notifications")) {
    if (!role) {
      return jsonForbidden("Authentication required", 401);
    }

    if (pathname.startsWith("/api/notifications/broadcast") && request.method === "POST") {
      if (![ROLES.BOSS, ROLES.MANAGER].includes(role)) {
        return jsonForbidden("Forbidden", 403);
      }
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/api/reports")) {
    if (!role) {
      return jsonForbidden("Authentication required", 401);
    }

    if (![ROLES.BOSS, ROLES.MANAGER, ROLES.EMPLOYEE].includes(role)) {
      return jsonForbidden("Forbidden", 403);
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/boss/:path*",
    "/manager/:path*",
    "/employee/:path*",
    "/api/auth/me",
    "/api/users/:path*",
    "/api/tasks/:path*",
    "/api/holidays/:path*",
    "/api/attendance/:path*",
    "/api/breaks/:path*",
    "/api/leaves/:path*",
    "/api/notifications/:path*",
    "/api/reports/:path*",
  ],
};
