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
import { getUtcDateStart, minutesBetween } from "@/lib/date";
import connectDB from "@/lib/db";
import BreakLog from "@/models/BreakLog";

const breakEndSchema = z.object({
  type: z.enum(BREAK_TYPES),
});

export async function POST(request) {
  const auth = await requireApiAuth(request, [ROLES.EMPLOYEE]);

  if (auth.error) {
    return auth.error;
  }

  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "breaks-end",
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

  const validation = breakEndSchema.safeParse({
    type: normalizeText(parsed.data.type),
  });

  if (!validation.success) {
    return jsonError("Invalid break end payload", 422, validation.error.flatten());
  }

  const { type } = validation.data;

  await connectDB();

  const today = getUtcDateStart(new Date());
  const now = new Date();

  const activeBreak = await BreakLog.findOne({
    user: auth.user._id,
    date: today,
    type,
    status: "active",
  });

  if (!activeBreak) {
    return NextResponse.json({ error: "No active break found for this type" }, { status: 404 });
  }

  activeBreak.endTime = now;
  activeBreak.durationMinutes = minutesBetween(activeBreak.startTime, now);
  activeBreak.status = "completed";
  await activeBreak.save();
  const allowedMinutes = activeBreak.allowedMinutes || BREAK_MINUTES_LIMIT[type] || 0;
  const exceededMinutes = Math.max(0, activeBreak.durationMinutes - allowedMinutes);

  const populated = await BreakLog.findById(activeBreak._id)
    .populate("user", "name email role")
    .lean();

  await recordAuditLog({
    actorId: auth.user._id,
    action: "break.end",
    entityType: "break",
    entityId: activeBreak._id,
    meta: {
      type,
      durationMinutes: activeBreak.durationMinutes,
      allowedMinutes,
      exceededMinutes,
      date: today,
    },
    request,
  });

  return NextResponse.json(
    {
      message: exceededMinutes > 0 ? "Break ended (limit exceeded)" : "Break ended",
      break: populated,
      exceededMinutes,
    },
    { status: 200 },
  );
}
