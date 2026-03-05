import { NextResponse } from "next/server";
import { z } from "zod";

import {
  enforceRateLimit,
  jsonError,
  normalizeText,
  requireApiAuth,
  safeJsonParse,
} from "@/lib/api";
import { recordAuditLog } from "@/lib/audit";
import { BREAK_MINUTES_LIMIT, BREAK_TYPES, ROLES } from "@/lib/constants";
import { getUtcDateStart } from "@/lib/date";
import connectDB from "@/lib/db";
import Attendance from "@/models/Attendance";
import BreakLog from "@/models/BreakLog";

const breakStartSchema = z.object({
  type: z.enum(BREAK_TYPES).optional().default("break"),
});

export async function POST(request) {
  const auth = await requireApiAuth(request, [ROLES.EMPLOYEE]);

  if (auth.error) {
    return auth.error;
  }

  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "breaks-start",
    identifier: String(auth.user._id),
    limit: 60,
    windowMs: 60 * 1000,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const parsed = await safeJsonParse(request);

  if (parsed.error) {
    return parsed.error;
  }

  const requestedType = normalizeText(parsed.data?.type || "break");
  const validation = breakStartSchema.safeParse({
    type: requestedType || "break",
  });

  if (!validation.success) {
    return jsonError("Invalid break start payload", 422, validation.error.flatten());
  }

  const { type } = validation.data;

  await connectDB();

  const today = getUtcDateStart(new Date());
  const now = new Date();

  const attendance = await Attendance.findOne({ user: auth.user._id, date: today });

  if (!(attendance?.shiftStart || attendance?.checkIn)) {
    return NextResponse.json({ error: "Shift start is required before taking a break" }, { status: 400 });
  }

  if (attendance.shiftEnd || attendance.checkOut) {
    return NextResponse.json({ error: "Cannot start break after shift end" }, { status: 400 });
  }

  const activeBreak = await BreakLog.findOne({
    user: auth.user._id,
    date: today,
    status: "active",
  }).lean();

  if (activeBreak) {
    return NextResponse.json({ error: "Another break is already active" }, { status: 409 });
  }

  const breakLog = await BreakLog.create({
    user: auth.user._id,
    attendance: attendance._id,
    date: today,
    type,
    allowedMinutes: BREAK_MINUTES_LIMIT[type] || 0,
    startTime: now,
    status: "active",
  });

  const populated = await BreakLog.findById(breakLog._id)
    .populate("user", "name email role")
    .lean();

  await recordAuditLog({
    actorId: auth.user._id,
    action: "break.start",
    entityType: "break",
    entityId: breakLog._id,
    meta: { type, date: today },
    request,
  });

  return NextResponse.json(
    { message: "Break started", break: populated },
    { status: 201 },
  );
}
