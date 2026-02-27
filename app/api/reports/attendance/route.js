import { NextResponse } from "next/server";

import { isValidObjectId, jsonError, normalizeText, requireApiAuth } from "@/lib/api";
import { ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { buildAttendanceReport } from "@/lib/report-attendance";

export async function GET(request) {
  const auth = await requireApiAuth(request);

  if (auth.error) {
    return auth.error;
  }

  const role = auth.user.role;

  if (![ROLES.BOSS, ROLES.MANAGER, ROLES.EMPLOYEE].includes(role)) {
    return jsonError("Forbidden", 403);
  }

  await connectDB();

  const url = new URL(request.url);
  const now = new Date();
  const month = Number(normalizeText(url.searchParams.get("month")) || now.getUTCMonth() + 1);
  const year = Number(normalizeText(url.searchParams.get("year")) || now.getUTCFullYear());
  const userIdQuery = normalizeText(url.searchParams.get("userId"));

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return jsonError("Invalid month (1-12)", 400);
  }

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return jsonError("Invalid year", 400);
  }

  let reportUserId = null;

  if (role === ROLES.EMPLOYEE) {
    reportUserId = auth.user._id;
  } else if (userIdQuery) {
    if (!isValidObjectId(userIdQuery)) {
      return jsonError("Invalid userId", 400);
    }

    reportUserId = userIdQuery;
  }

  const report = await buildAttendanceReport({ month, year, userId: reportUserId });

  return NextResponse.json(report, { status: 200 });
}
