import { NextResponse } from "next/server";
import { z } from "zod";

import {
  enforceRateLimit,
  isValidObjectId,
  jsonError,
  normalizeText,
  parseDateOnly,
  requireApiAuth,
  safeJsonParse,
} from "@/lib/api";
import { recordAuditLog } from "@/lib/audit";
import { ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { notifyRoles } from "@/lib/notify";
import Holiday from "@/models/Holiday";

const updateHolidaySchema = z.object({
  title: z.string().trim().min(2).max(140),
  date: z.string().trim().min(1),
  description: z.string().trim().max(500).optional().default(""),
});

export async function PATCH(request, { params }) {
  const auth = await requireApiAuth(request, [ROLES.BOSS]);

  if (auth.error) {
    return auth.error;
  }

  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "holidays-update",
    identifier: String(auth.user._id),
    limit: 50,
    windowMs: 60 * 1000,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const resolvedParams = await params;
  const holidayId = resolvedParams.id;

  if (!isValidObjectId(holidayId)) {
    return jsonError("Invalid holiday id", 400);
  }

  const parsed = await safeJsonParse(request);

  if (parsed.error) {
    return parsed.error;
  }

  const validation = updateHolidaySchema.safeParse({
    title: normalizeText(parsed.data.title),
    date: normalizeText(parsed.data.date),
    description: normalizeText(parsed.data.description),
  });

  if (!validation.success) {
    return jsonError("Invalid holiday payload", 422, validation.error.flatten());
  }

  const { title, date: dateText, description } = validation.data;
  const date = parseDateOnly(dateText);

  if (!date) {
    return jsonError("date must be a valid date", 422);
  }

  await connectDB();

  const holiday = await Holiday.findById(holidayId);

  if (!holiday) {
    return jsonError("Holiday not found", 404);
  }

  holiday.title = title;
  holiday.date = date;
  holiday.description = description;
  await holiday.save();

  const populatedHoliday = await Holiday.findById(holiday._id)
    .populate("createdBy", "name email role")
    .lean();

  await recordAuditLog({
    actorId: auth.user._id,
    action: "holiday.update",
    entityType: "holiday",
    entityId: holiday._id,
    meta: { title, date },
    request,
  });

  await notifyRoles({
    roles: [ROLES.MANAGER, ROLES.EMPLOYEE],
    title: "Holiday Updated",
    message: `Holiday updated: ${title} on ${date.toISOString().slice(0, 10)}.`,
    type: "holiday-updated",
    meta: { holidayId: String(holiday._id), date, title },
  });

  return NextResponse.json(
    { message: "Holiday updated successfully", holiday: populatedHoliday },
    { status: 200 },
  );
}

export async function DELETE(request, { params }) {
  const auth = await requireApiAuth(request, [ROLES.BOSS]);

  if (auth.error) {
    return auth.error;
  }

  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "holidays-delete",
    identifier: String(auth.user._id),
    limit: 30,
    windowMs: 60 * 1000,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const resolvedParams = await params;
  const holidayId = resolvedParams.id;

  if (!isValidObjectId(holidayId)) {
    return jsonError("Invalid holiday id", 400);
  }

  await connectDB();

  const deletedHoliday = await Holiday.findByIdAndDelete(holidayId).lean();

  if (!deletedHoliday) {
    return jsonError("Holiday not found", 404);
  }

  await recordAuditLog({
    actorId: auth.user._id,
    action: "holiday.delete",
    entityType: "holiday",
    entityId: holidayId,
    meta: { title: deletedHoliday.title, date: deletedHoliday.date },
    request,
  });

  await notifyRoles({
    roles: [ROLES.MANAGER, ROLES.EMPLOYEE],
    title: "Holiday Removed",
    message: `Holiday removed: ${deletedHoliday.title}.`,
    type: "holiday-deleted",
    meta: { holidayId, title: deletedHoliday.title },
  });

  return NextResponse.json({ message: "Holiday deleted successfully" }, { status: 200 });
}
