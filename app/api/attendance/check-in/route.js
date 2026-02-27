import { NextResponse } from "next/server";

import {
  enforceRateLimit,
  requireApiAuth,
} from "@/lib/api";
import { recordAuditLog } from "@/lib/audit";
import { ROLES } from "@/lib/constants";
import { getUtcDateStart, minutesBetween } from "@/lib/date";
import connectDB from "@/lib/db";
import Attendance from "@/models/Attendance";
import { resolveShiftForUserAndDate } from "@/lib/shift";

export async function POST(request) {
  const auth = await requireApiAuth(request, [ROLES.EMPLOYEE]);

  if (auth.error) {
    return auth.error;
  }

  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "attendance-check-in",
    identifier: String(auth.user._id),
    limit: 20,
    windowMs: 60 * 1000,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  await connectDB();

  const today = getUtcDateStart(new Date());
  const now = new Date();

  const shiftInfo = await resolveShiftForUserAndDate(auth.user, now);
  const lateGraceMinutes = Number(process.env.SHIFT_LATE_GRACE_MINUTES || 10);
  const shiftLateMinutes = minutesBetween(shiftInfo.scheduledStart, now);
  const isLate = shiftLateMinutes > lateGraceMinutes;
  const isWeeklyOff = shiftInfo.weeklyOffDays.includes(today.getUTCDay());

  const existing = await Attendance.findOne({ user: auth.user._id, date: today });

  if (existing?.shiftStart || existing?.checkIn) {
    return NextResponse.json({ error: "Shift already started for today" }, { status: 409 });
  }

  const attendance = existing
    ? await Attendance.findByIdAndUpdate(
        existing._id,
        {
          shiftStart: now,
          shiftEnd: null,
          checkIn: now,
          checkOut: null,
          scheduledStart: shiftInfo.scheduledStart,
          scheduledEnd: shiftInfo.scheduledEnd,
          shiftType: shiftInfo.shiftType,
          isLate,
          lateMinutes: isLate ? shiftLateMinutes : 0,
          overtimeMinutes: 0,
          totalWorkMinutes: 0,
          status: isWeeklyOff ? "weekly-off" : "present",
        },
        { new: true },
      )
    : await Attendance.create({
        user: auth.user._id,
        date: today,
        shiftStart: now,
        shiftEnd: null,
        checkIn: now,
        checkOut: null,
        scheduledStart: shiftInfo.scheduledStart,
        scheduledEnd: shiftInfo.scheduledEnd,
        shiftType: shiftInfo.shiftType,
        isLate,
        lateMinutes: isLate ? shiftLateMinutes : 0,
        overtimeMinutes: 0,
        status: isWeeklyOff ? "weekly-off" : "present",
      });

  const populated = await Attendance.findById(attendance._id)
    .populate("user", "name email role")
    .lean();

  await recordAuditLog({
    actorId: auth.user._id,
    action: "attendance.shift-start",
    entityType: "attendance",
    entityId: attendance._id,
    meta: {
      date: today,
      shiftType: shiftInfo.shiftType,
      isLate,
      lateMinutes: isLate ? shiftLateMinutes : 0,
    },
    request,
  });

  return NextResponse.json(
    { message: "Shift started successfully", attendance: populated },
    { status: 201 },
  );
}
