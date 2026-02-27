import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  enforceRateLimit,
  getPagination,
  jsonError,
  normalizeText,
  requireApiAuth,
  safeJsonParse,
} from "@/lib/api";
import { recordAuditLog } from "@/lib/audit";
import { GENDERS, ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { getOrCreateLeaveBalance } from "@/lib/leave-balance";
import { notifyUser } from "@/lib/notify";
import User from "@/models/User";

const createUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
  role: z.enum([ROLES.MANAGER, ROLES.EMPLOYEE]),
  gender: z.enum(GENDERS).optional().default("male"),
  department: z.string().trim().max(80).optional().default("General"),
  designation: z.string().trim().max(80).optional().default("Staff"),
  employeeCode: z.string().trim().max(30).optional().default(""),
  phone: z.string().trim().max(30).optional().default(""),
  baseSalary: z.number().nonnegative().optional().default(0),
  weeklyOffDays: z.array(z.number().int().min(0).max(6)).optional(),
});

export async function GET(request) {
  const auth = await requireApiAuth(request, [ROLES.BOSS, ROLES.MANAGER]);

  if (auth.error) {
    return auth.error;
  }

  await connectDB();

  const url = new URL(request.url);
  const { page, limit, skip } = getPagination(url.searchParams, { defaultLimit: 20, maxLimit: 100 });
  const total = await User.countDocuments({});
  const users = await User.find(
    {},
    "name email role gender department designation employeeCode phone baseSalary shiftType weeklyOffDays createdAt",
  )
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return NextResponse.json(
    {
      users,
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
    keyPrefix: "users-create",
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

  const validation = createUserSchema.safeParse({
    name: normalizeText(parsed.data.name),
    email: normalizeText(parsed.data.email).toLowerCase(),
    password: normalizeText(parsed.data.password),
    role: normalizeText(parsed.data.role),
    gender: normalizeText(parsed.data.gender || "male"),
    department: normalizeText(parsed.data.department || "General"),
    designation: normalizeText(parsed.data.designation || "Staff"),
    employeeCode: normalizeText(parsed.data.employeeCode || ""),
    phone: normalizeText(parsed.data.phone || ""),
    baseSalary: parsed.data.baseSalary ? Number(parsed.data.baseSalary) : 0,
    weeklyOffDays: Array.isArray(parsed.data.weeklyOffDays)
      ? parsed.data.weeklyOffDays.map((value) => Number(value))
      : undefined,
  });

  if (!validation.success) {
    return jsonError("Invalid user payload", 422, validation.error.flatten());
  }

  const {
    name,
    email,
    password,
    role,
    gender,
    department,
    designation,
    employeeCode,
    phone,
    baseSalary,
    weeklyOffDays,
  } = validation.data;

  await connectDB();

  const existingUser = await User.findOne({ email }).lean();

  if (existingUser) {
    return jsonError("Email already exists", 409);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const createdUser = await User.create({
    name,
    email,
    password: hashedPassword,
    role,
    gender,
    department,
    designation,
    employeeCode: employeeCode || undefined,
    phone,
    baseSalary,
    shiftType: gender === "female" ? "women-day" : "men-day",
    weeklyOffDays: weeklyOffDays?.length ? weeklyOffDays : [0],
  });

  await getOrCreateLeaveBalance(createdUser._id, new Date().getUTCFullYear());

  await recordAuditLog({
    actorId: auth.user._id,
    action: "user.create",
    entityType: "user",
    entityId: createdUser._id,
    meta: { role: createdUser.role, email: createdUser.email },
    request,
  });

  await notifyUser({
    userId: createdUser._id,
    email: createdUser.email,
    title: "Welcome to Employee Management Portal",
    message: `Your account has been created with role: ${createdUser.role}.`,
    type: "account-created",
    meta: { role: createdUser.role },
    sendMail: true,
  });

  return NextResponse.json(
    {
      message: "User created successfully",
      user: {
        id: String(createdUser._id),
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role,
        gender: createdUser.gender,
        department: createdUser.department,
        designation: createdUser.designation,
        employeeCode: createdUser.employeeCode,
        phone: createdUser.phone,
        baseSalary: createdUser.baseSalary,
        shiftType: createdUser.shiftType,
        weeklyOffDays: createdUser.weeklyOffDays,
        createdAt: createdUser.createdAt,
      },
    },
    { status: 201 },
  );
}
