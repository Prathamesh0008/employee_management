import { differenceInCalendarDays } from "date-fns";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  enforceRateLimit,
  getPagination,
  jsonError,
  normalizeText,
  parseDateOnly,
  requireApiAuth,
  safeJsonParse,
} from "@/lib/api";
import { recordAuditLog } from "@/lib/audit";
import { LEAVE_STATUSES, LEAVE_TYPES, ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { calculateRemaining, getOrCreateLeaveBalance } from "@/lib/leave-balance";
import { notifyRoles } from "@/lib/notify";
import Leave from "@/models/Leave";

const leaveApplySchema = z.object({
  fromDate: z.string().trim().min(1),
  toDate: z.string().trim().min(1),
  leaveType: z.enum(LEAVE_TYPES),
  reason: z.string().trim().min(3).max(1000),
});

export async function GET(request) {
  const auth = await requireApiAuth(request);

  if (auth.error) {
    return auth.error;
  }

  await connectDB();

  const url = new URL(request.url);
  const status = normalizeText(url.searchParams.get("status"));
  const filter = {};

  if (auth.user.role === ROLES.EMPLOYEE) {
    filter.user = auth.user._id;
  }

  if (status) {
    if (!LEAVE_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid leave status filter" }, { status: 400 });
    }

    filter.status = status;
  }

  const { page, limit, skip } = getPagination(url.searchParams, { defaultLimit: 20, maxLimit: 100 });
  const total = await Leave.countDocuments(filter);

  const leaves = await Leave.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("user", "name email role")
    .populate("reviewedBy", "name email role")
    .lean();

  return NextResponse.json(
    {
      leaves,
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

export async function POST(request) {
  const auth = await requireApiAuth(request, [ROLES.EMPLOYEE]);

  if (auth.error) {
    return auth.error;
  }

  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "leaves-create",
    identifier: String(auth.user._id),
    limit: 20,
    windowMs: 60 * 1000,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const parsed = await safeJsonParse(request);

  if (parsed.error) {
    return parsed.error;
  }

  const validation = leaveApplySchema.safeParse({
    fromDate: normalizeText(parsed.data.fromDate),
    toDate: normalizeText(parsed.data.toDate),
    leaveType: normalizeText(parsed.data.leaveType || "casual"),
    reason: normalizeText(parsed.data.reason),
  });

  if (!validation.success) {
    return jsonError("Invalid leave payload", 422, validation.error.flatten());
  }

  const { fromDate: fromDateText, toDate: toDateText, leaveType, reason } = validation.data;
  const fromDate = parseDateOnly(fromDateText);
  const toDate = parseDateOnly(toDateText);

  if (!fromDate || !toDate) {
    return jsonError("fromDate and toDate must be valid dates", 422);
  }

  if (toDate < fromDate) {
    return NextResponse.json(
      { error: "toDate must be same as or after fromDate" },
      { status: 400 },
    );
  }

  if (fromDate.getUTCFullYear() !== toDate.getUTCFullYear()) {
    return NextResponse.json(
      { error: "Leave range must stay within a single year" },
      { status: 400 },
    );
  }

  const totalDays = differenceInCalendarDays(toDate, fromDate) + 1;

  await connectDB();

  const balance = await getOrCreateLeaveBalance(auth.user._id, fromDate.getUTCFullYear());
  const remaining = calculateRemaining(balance)[leaveType];

  if (remaining < totalDays) {
    return NextResponse.json(
      {
        error: `Insufficient ${leaveType} leave balance. Remaining: ${remaining} day(s)`,
      },
      { status: 400 },
    );
  }

  const leave = await Leave.create({
    user: auth.user._id,
    fromDate,
    toDate,
    leaveType,
    reason,
    totalDays,
    status: "pending",
  });

  const populated = await Leave.findById(leave._id)
    .populate("user", "name email role")
    .populate("reviewedBy", "name email role")
    .lean();

  await recordAuditLog({
    actorId: auth.user._id,
    action: "leave.apply",
    entityType: "leave",
    entityId: leave._id,
    meta: { fromDate, toDate, leaveType, totalDays },
    request,
  });

  await notifyRoles({
    roles: [ROLES.MANAGER],
    title: "New Leave Application",
    message: `${auth.user.name} applied for ${leaveType} leave (${totalDays} day(s)).`,
    type: "leave-applied",
    meta: {
      leaveId: String(leave._id),
      employeeId: String(auth.user._id),
      leaveType,
      totalDays,
    },
    sendMail: true,
  });

  return NextResponse.json(
    { message: "Leave application submitted", leave: populated },
    { status: 201 },
  );
}
