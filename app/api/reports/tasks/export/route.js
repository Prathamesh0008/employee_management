import { NextResponse } from "next/server";

import { jsonError, normalizeText, requireApiAuth } from "@/lib/api";
import { ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { buildTaskReport, taskReportToCsv } from "@/lib/report-tasks";

export async function GET(request) {
  const auth = await requireApiAuth(request, [ROLES.MANAGER, ROLES.BOSS]);

  if (auth.error) {
    return auth.error;
  }

  const url = new URL(request.url);
  const now = new Date();
  const month = Number(normalizeText(url.searchParams.get("month")) || now.getUTCMonth() + 1);
  const year = Number(normalizeText(url.searchParams.get("year")) || now.getUTCFullYear());

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return jsonError("Invalid month (1-12)", 400);
  }

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return jsonError("Invalid year", 400);
  }

  await connectDB();

  const report = await buildTaskReport({
    role: auth.user.role,
    userId: auth.user.role === ROLES.MANAGER ? auth.user._id : null,
    month,
    year,
  });
  const csv = taskReportToCsv(report);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="task-report-${year}-${String(month).padStart(2, "0")}.csv"`,
    },
  });
}
