import { NextResponse } from "next/server";

import {
  getPagination,
  normalizeText,
  parseDateOnly,
  requireApiAuth,
} from "@/lib/api";
import { ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import Attendance from "@/models/Attendance";

export async function GET(request) {
  const auth = await requireApiAuth(request);

  if (auth.error) {
    return auth.error;
  }

  await connectDB();

  const url = new URL(request.url);
  const dateFilter = parseDateOnly(url.searchParams.get("date"));
  const filter = {};

  if (auth.user.role === ROLES.EMPLOYEE) {
    filter.user = auth.user._id;
  }

  if (normalizeText(url.searchParams.get("date"))) {
    if (!dateFilter) {
      return NextResponse.json({ error: "Invalid date query" }, { status: 400 });
    }

    filter.date = dateFilter;
  }

  const { page, limit, skip } = getPagination(url.searchParams, { defaultLimit: 20, maxLimit: 100 });
  const total = await Attendance.countDocuments(filter);

  const attendance = await Attendance.find(filter)
    .sort({ date: -1, shiftStart: -1, checkIn: -1 })
    .skip(skip)
    .limit(limit)
    .populate("user", "name email role")
    .lean();

  return NextResponse.json(
    {
      attendance,
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
