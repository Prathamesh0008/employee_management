import { NextResponse } from "next/server";

import {
  getPagination,
  normalizeText,
  parseDateOnly,
  requireApiAuth,
} from "@/lib/api";
import { ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import BreakLog from "@/models/BreakLog";

export async function GET(request) {
  const auth = await requireApiAuth(request);

  if (auth.error) {
    return auth.error;
  }

  await connectDB();

  const url = new URL(request.url);
  const dateText = normalizeText(url.searchParams.get("date"));
  const date = parseDateOnly(dateText);

  if (dateText && !date) {
    return NextResponse.json({ error: "Invalid date query" }, { status: 400 });
  }

  const filter = {};

  if (auth.user.role === ROLES.EMPLOYEE) {
    filter.user = auth.user._id;
  }

  if (date) {
    filter.date = date;
  }

  const { page, limit, skip } = getPagination(url.searchParams, { defaultLimit: 20, maxLimit: 100 });
  const total = await BreakLog.countDocuments(filter);

  const breaks = await BreakLog.find(filter)
    .sort({ date: -1, startTime: -1 })
    .skip(skip)
    .limit(limit)
    .populate("user", "name email role")
    .lean();

  return NextResponse.json(
    {
      breaks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    },
    { status: 200 },
  );
}
