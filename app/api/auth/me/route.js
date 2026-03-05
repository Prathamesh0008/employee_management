import { NextResponse } from "next/server";

import { requireApiAuth } from "@/lib/api";
import { createCsrfToken, setCsrfCookie } from "@/lib/csrf";
import { CSRF_COOKIE_NAME } from "@/lib/constants";

export async function GET(request) {
  const auth = await requireApiAuth(request);

  if (auth.error) {
    return auth.error;
  }

  const user = auth.user;
  const existingCsrfToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const csrfToken = existingCsrfToken || createCsrfToken();

  const response = NextResponse.json(
    {
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        gender: user.gender,
        department: user.department,
        designation: user.designation,
        employeeCode: user.employeeCode,
        shiftType: user.shiftType,
        weeklyOffDays: user.weeklyOffDays,
        drivingMode: Boolean(user.drivingMode),
      },
      csrfToken,
    },
    { status: 200 },
  );

  if (!existingCsrfToken) {
    setCsrfCookie(response, csrfToken);
  }

  return response;
}
