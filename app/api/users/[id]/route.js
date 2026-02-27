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
import { GENDERS, ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import User from "@/models/User";

const userUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  role: z.enum([ROLES.MANAGER, ROLES.EMPLOYEE]).optional(),
  gender: z.enum(GENDERS).optional(),
  department: z.string().trim().max(80).optional(),
  designation: z.string().trim().max(80).optional(),
  employeeCode: z.string().trim().max(30).optional(),
  phone: z.string().trim().max(30).optional(),
  baseSalary: z.number().nonnegative().optional(),
  weeklyOffDays: z.array(z.number().int().min(0).max(6)).optional(),
});

function textOrUndefined(value) {
  const cleaned = normalizeText(value);
  return cleaned || undefined;
}

export async function PATCH(request, { params }) {
  const auth = await requireApiAuth(request, [ROLES.BOSS, ROLES.MANAGER]);

  if (auth.error) {
    return auth.error;
  }

  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "users-update",
    identifier: String(auth.user._id),
    limit: 50,
    windowMs: 60 * 1000,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const resolvedParams = await params;
  const userId = resolvedParams.id;

  if (!isValidObjectId(userId)) {
    return jsonError("Invalid user id", 400);
  }

  const parsed = await safeJsonParse(request);

  if (parsed.error) {
    return parsed.error;
  }

  const validation = userUpdateSchema.safeParse({
    name: textOrUndefined(parsed.data.name),
    role: textOrUndefined(parsed.data.role),
    gender: textOrUndefined(parsed.data.gender),
    department: textOrUndefined(parsed.data.department),
    designation: textOrUndefined(parsed.data.designation),
    employeeCode: textOrUndefined(parsed.data.employeeCode),
    phone: textOrUndefined(parsed.data.phone),
    baseSalary:
      parsed.data.baseSalary !== undefined ? Number(parsed.data.baseSalary) : undefined,
    weeklyOffDays: Array.isArray(parsed.data.weeklyOffDays)
      ? parsed.data.weeklyOffDays.map((value) => Number(value))
      : undefined,
  });

  if (!validation.success) {
    return jsonError("Invalid user update payload", 422, validation.error.flatten());
  }

  await connectDB();

  const user = await User.findById(userId);

  if (!user) {
    return jsonError("User not found", 404);
  }

  const data = validation.data;
  const isBoss = auth.user.role === ROLES.BOSS;

  if (data.name !== undefined) user.name = data.name;
  if (data.gender !== undefined) user.gender = data.gender;
  if (data.department !== undefined) user.department = data.department;
  if (data.designation !== undefined) user.designation = data.designation;
  if (data.employeeCode !== undefined) user.employeeCode = data.employeeCode || undefined;
  if (data.phone !== undefined) user.phone = data.phone;
  if (data.weeklyOffDays !== undefined) user.weeklyOffDays = data.weeklyOffDays;
  if (data.gender !== undefined) {
    user.shiftType = data.gender === "female" ? "women-day" : "men-day";
  }
  if (!["women-day", "men-day"].includes(user.shiftType)) {
    user.shiftType = user.gender === "female" ? "women-day" : "men-day";
  }

  if (isBoss) {
    if (data.role !== undefined) user.role = data.role;
    if (data.baseSalary !== undefined) user.baseSalary = data.baseSalary;
  }

  await user.save();

  await recordAuditLog({
    actorId: auth.user._id,
    action: "user.update",
    entityType: "user",
    entityId: user._id,
    meta: {
      updatedFields: Object.keys(data),
      actorRole: auth.user.role,
    },
    request,
  });

  return NextResponse.json(
    {
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        gender: user.gender,
        department: user.department,
        designation: user.designation,
        employeeCode: user.employeeCode,
        phone: user.phone,
        baseSalary: user.baseSalary,
        shiftType: user.shiftType,
        weeklyOffDays: user.weeklyOffDays,
      },
    },
    { status: 200 },
  );
}
