import { NextResponse } from "next/server";

import { enforceRateLimit, requireApiAuth } from "@/lib/api";
import { recordAuditLog } from "@/lib/audit";
import { ROLES } from "@/lib/constants";
import { getUtcDateStart, minutesBetween } from "@/lib/date";
import connectDB from "@/lib/db";
import Attendance from "@/models/Attendance";
import BreakLog from "@/models/BreakLog";

export async function POST(request) {
  const auth = await requireApiAuth(request, [ROLES.EMPLOYEE]);

  if (auth.error) {
    return auth.error;
  }

  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "attendance-check-out",
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

  const attendance = await Attendance.findOne({ user: auth.user._id, date: today });

  if (!attendance || !(attendance.shiftStart || attendance.checkIn)) {
    return NextResponse.json({ error: "Shift start is required before shift end" }, { status: 400 });
  }

  if (attendance.shiftEnd || attendance.checkOut) {
    return NextResponse.json({ error: "Shift already ended for today" }, { status: 409 });
  }

  const activeBreak = await BreakLog.findOne({
    user: auth.user._id,
    date: today,
    status: "active",
  }).lean();

  if (activeBreak) {
    return NextResponse.json(
      { error: "End active break before shift end" },
      { status: 400 },
    );
  }

  const completedBreaks = await BreakLog.find({
    user: auth.user._id,
    date: today,
    status: "completed",
  }).lean();

  const totalBreakMinutes = completedBreaks.reduce(
    (sum, item) => sum + (item.durationMinutes || 0),
    0,
  );

  const shiftStartTime = attendance.shiftStart || attendance.checkIn;
  const totalWorkMinutes = Math.max(0, minutesBetween(shiftStartTime, now) - totalBreakMinutes);
  const halfDayThreshold = Number(process.env.SHIFT_HALF_DAY_MINUTES || 240);
  const scheduledMinutes = attendance.scheduledStart && attendance.scheduledEnd
    ? minutesBetween(attendance.scheduledStart, attendance.scheduledEnd)
    : 0;

  attendance.shiftEnd = now;
  attendance.checkOut = now;
  attendance.totalWorkMinutes = totalWorkMinutes;
  attendance.overtimeMinutes = Math.max(0, totalWorkMinutes - scheduledMinutes);
  if (attendance.status !== "weekly-off") {
    attendance.status = totalWorkMinutes < halfDayThreshold ? "half-day" : "present";
  }
  await attendance.save();

  const populated = await Attendance.findById(attendance._id)
    .populate("user", "name email role")
    .lean();

  await recordAuditLog({
    actorId: auth.user._id,
    action: "attendance.shift-end",
    entityType: "attendance",
    entityId: attendance._id,
    meta: { totalWorkMinutes, totalBreakMinutes, date: today },
    request,
  });

  return NextResponse.json(
    { message: "Shift ended successfully", attendance: populated },
    { status: 200 },
  );
}
