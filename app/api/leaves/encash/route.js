import { NextResponse } from "next/server";
import { z } from "zod";

import {
  enforceRateLimit,
  isValidObjectId,
  jsonError,
  normalizeText,
  requireApiAuth,
  safeJsonParse,
} from "@/lib/api";
import { recordAuditLog } from "@/lib/audit";
import { LEAVE_TYPES, ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { applyEncashment } from "@/lib/leave-policy";
import { calculateRemaining, getOrCreateLeaveBalance } from "@/lib/leave-balance";
import { notifyUser } from "@/lib/notify";
import User from "@/models/User";

const encashSchema = z.object({
  userId: z.string().trim().min(1),
  year: z.number().int().min(2000).max(2100).optional(),
  leaveType: z.enum(LEAVE_TYPES),
  days: z.number().int().min(1).max(365),
  amountPerDay: z.number().nonnegative().optional().default(0),
});

export async function POST(request) {
  const auth = await requireApiAuth(request, [ROLES.MANAGER]);

  if (auth.error) {
    return auth.error;
  }

  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "leaves-encash",
    identifier: String(auth.user._id),
    limit: 30,
    windowMs: 60 * 1000,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const parsed = await safeJsonParse(request);

  if (parsed.error) {
    return parsed.error;
  }

  const validation = encashSchema.safeParse({
    userId: normalizeText(parsed.data.userId),
    year: parsed.data.year ? Number(parsed.data.year) : undefined,
    leaveType: normalizeText(parsed.data.leaveType),
    days: Number(parsed.data.days),
    amountPerDay: parsed.data.amountPerDay ? Number(parsed.data.amountPerDay) : 0,
  });

  if (!validation.success) {
    return jsonError("Invalid leave encash payload", 422, validation.error.flatten());
  }

  const { userId, leaveType, days, amountPerDay } = validation.data;
  const year = validation.data.year || new Date().getUTCFullYear();

  if (!isValidObjectId(userId)) {
    return jsonError("Invalid userId", 400);
  }

  await connectDB();

  const user = await User.findById(userId, "name email role").lean();

  if (!user) {
    return jsonError("User not found", 404);
  }

  const balance = await getOrCreateLeaveBalance(userId, year);
  const remaining = calculateRemaining(balance)[leaveType] || 0;

  if (remaining < days) {
    return jsonError(`Insufficient ${leaveType} leave for encashment. Remaining: ${remaining}`, 400);
  }

  applyEncashment(balance, leaveType, days);
  await balance.save();

  const encashAmount = Math.floor(days * amountPerDay);

  await notifyUser({
    userId,
    email: user.email,
    title: "Leave Encashment Processed",
    message: `${days} day(s) of ${leaveType} leave encashed for ${year}. Amount: ${encashAmount}.`,
    type: "leave-encashed",
    meta: { year, leaveType, days, encashAmount },
    sendMail: true,
  });

  await recordAuditLog({
    actorId: auth.user._id,
    action: "leave.encash",
    entityType: "leave-balance",
    entityId: balance._id,
    meta: { userId, year, leaveType, days, encashAmount },
    request,
  });

  return NextResponse.json(
    {
      message: "Leave encashment completed",
      year,
      userId,
      leaveType,
      days,
      encashAmount,
    },
    { status: 200 },
  );
}
