import { NextResponse } from "next/server";
import { z } from "zod";

import {
  enforceRateLimit,
  getPagination,
  isValidObjectId,
  jsonError,
  normalizeText,
  parseDateOnly,
  requireApiAuth,
  safeJsonParse,
} from "@/lib/api";
import { recordAuditLog } from "@/lib/audit";
import { ROLES } from "@/lib/constants";
import { getMonthBoundsUTC } from "@/lib/date";
import connectDB from "@/lib/db";
import { notifyRoles } from "@/lib/notify";
import Holiday from "@/models/Holiday";

const createHolidaySchema = z.object({
  title: z.string().trim().min(2).max(140),
  date: z.string().trim().min(1),
  description: z.string().trim().max(500).optional().default(""),
});

export async function GET(request) {
  const auth = await requireApiAuth(request);

  if (auth.error) {
    return auth.error;
  }

  const url = new URL(request.url);
  const monthText = normalizeText(url.searchParams.get("month"));
  const yearText = normalizeText(url.searchParams.get("year"));

  const filter = {};

  if (monthText || yearText) {
    const month = Number(monthText);
    const year = Number(yearText);

    if (
      !Number.isInteger(month) ||
      !Number.isInteger(year) ||
      month < 1 ||
      month > 12 ||
      year < 1970 ||
      year > 2100
    ) {
      return jsonError("month (1-12) and year are required when filtering", 400);
    }

    const { start, end } = getMonthBoundsUTC(year, month);
    filter.date = { $gte: start, $lt: end };
  }

  await connectDB();
  const { page, limit, skip } = getPagination(url.searchParams, { defaultLimit: 50, maxLimit: 200 });
  const total = await Holiday.countDocuments(filter);

  const holidays = await Holiday.find(filter)
    .sort({ date: 1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("createdBy", "name email role")
    .lean();

  return NextResponse.json(
    {
      holidays,
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
  const auth = await requireApiAuth(request, [ROLES.BOSS]);

  if (auth.error) {
    return auth.error;
  }

  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "holidays-create",
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

  const validation = createHolidaySchema.safeParse({
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

  if (!isValidObjectId(auth.user._id)) {
    return jsonError("Invalid creator id", 400);
  }

  await connectDB();

  const holiday = await Holiday.create({
    title,
    date,
    description,
    createdBy: auth.user._id,
  });

  const populatedHoliday = await Holiday.findById(holiday._id)
    .populate("createdBy", "name email role")
    .lean();

  await recordAuditLog({
    actorId: auth.user._id,
    action: "holiday.create",
    entityType: "holiday",
    entityId: holiday._id,
    meta: { title, date },
    request,
  });

  await notifyRoles({
    roles: [ROLES.MANAGER, ROLES.EMPLOYEE],
    title: "New Company Holiday",
    message: `Holiday added: ${title} on ${date.toISOString().slice(0, 10)}.`,
    type: "holiday-created",
    meta: { holidayId: String(holiday._id), date, title },
  });

  return NextResponse.json(
    { message: "Holiday created successfully", holiday: populatedHoliday },
    { status: 201 },
  );
}
