import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getPagination,
  isValidObjectId,
  jsonError,
  normalizeText,
  requireApiAuth,
  safeJsonParse,
} from "@/lib/api";
import { recordAuditLog } from "@/lib/audit";
import { LEAVE_TYPES, ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import {
  calculateRemaining,
  ensureBalanceShape,
  ensureUsedShape,
  getOrCreateLeaveBalance,
  normalizeAllocatedDays,
} from "@/lib/leave-balance";
import LeaveBalance from "@/models/LeaveBalance";
import User from "@/models/User";

const balanceUpdateSchema = z.object({
  userId: z.string().trim().min(1),
  year: z.number().int().min(2000).max(2100).optional(),
  allocated: z
    .object({
      casual: z.number().int().min(0).optional(),
      sick: z.number().int().min(0).optional(),
      paid: z.number().int().min(0).optional(),
      unpaid: z.number().int().min(0).optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one leave type allocation is required",
    }),
});

function formatBalanceDoc(doc) {
  const allocated = normalizeAllocatedDays(doc.allocated);
  const carryForward = ensureBalanceShape(doc.carryForward);
  const accrued = ensureBalanceShape(doc.accrued);
  const used = ensureUsedShape(doc.used);
  const encashed = ensureBalanceShape(doc.encashed);

  return {
    id: String(doc._id),
    user: doc.user,
    year: doc.year,
    allocated,
    carryForward,
    accrued,
    used,
    encashed,
    remaining: calculateRemaining({ allocated, carryForward, accrued, used, encashed }),
    lastAccrualMonth: doc.lastAccrualMonth || 0,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function GET(request) {
  const auth = await requireApiAuth(request);

  if (auth.error) {
    return auth.error;
  }

  await connectDB();

  const url = new URL(request.url);
  const year = Number(normalizeText(url.searchParams.get("year")) || new Date().getUTCFullYear());
  const userIdQuery = normalizeText(url.searchParams.get("userId"));

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return jsonError("Invalid year", 400);
  }

  if (auth.user.role === ROLES.EMPLOYEE) {
    const balance = await getOrCreateLeaveBalance(auth.user._id, year);
    await balance.populate("user", "name email role");

    return NextResponse.json({ balance: formatBalanceDoc(balance.toObject()) }, { status: 200 });
  }

  if (userIdQuery) {
    if (!isValidObjectId(userIdQuery)) {
      return jsonError("Invalid userId", 400);
    }

    const balance = await getOrCreateLeaveBalance(userIdQuery, year);
    await balance.populate("user", "name email role");

    return NextResponse.json({ balance: formatBalanceDoc(balance.toObject()) }, { status: 200 });
  }

  const { page, limit, skip } = getPagination(url.searchParams, { defaultLimit: 20, maxLimit: 100 });

  const usersFilter = { role: { $in: [ROLES.MANAGER, ROLES.EMPLOYEE] } };
  const totalUsers = await User.countDocuments(usersFilter);
  const users = await User.find(usersFilter, "name email role")
    .sort({ name: 1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const userIds = users.map((user) => user._id);
  const balances = await LeaveBalance.find({
    user: { $in: userIds },
    year,
  }).lean();

  const balanceByUser = new Map(balances.map((item) => [String(item.user), item]));

  const results = users.map((user) => {
    const found = balanceByUser.get(String(user._id));

    if (found) {
      return formatBalanceDoc({ ...found, user });
    }

    const allocated = normalizeAllocatedDays();
    const carryForward = ensureBalanceShape();
    const accrued = ensureBalanceShape();
    const used = ensureUsedShape();
    const encashed = ensureBalanceShape();

    return {
      id: "",
      user,
      year,
      allocated,
      carryForward,
      accrued,
      used,
      encashed,
      remaining: calculateRemaining({ allocated, carryForward, accrued, used, encashed }),
      lastAccrualMonth: 0,
      createdAt: null,
      updatedAt: null,
    };
  });

  return NextResponse.json(
    {
      balances: results,
      pagination: {
        page,
        limit,
        total: totalUsers,
        totalPages: Math.max(1, Math.ceil(totalUsers / limit)),
      },
    },
    { status: 200 },
  );
}

export async function PATCH(request) {
  const auth = await requireApiAuth(request, [ROLES.MANAGER]);

  if (auth.error) {
    return auth.error;
  }

  const parsed = await safeJsonParse(request);

  if (parsed.error) {
    return parsed.error;
  }

  const rawBody = {
    userId: normalizeText(parsed.data.userId),
    year: parsed.data.year ? Number(parsed.data.year) : undefined,
    allocated: parsed.data.allocated || {},
  };

  const validation = balanceUpdateSchema.safeParse(rawBody);

  if (!validation.success) {
    return jsonError("Invalid leave balance payload", 422, validation.error.flatten());
  }

  const { userId, allocated } = validation.data;
  const year = validation.data.year || new Date().getUTCFullYear();

  if (!isValidObjectId(userId)) {
    return jsonError("Invalid userId", 400);
  }

  await connectDB();

  const targetUser = await User.findById(userId, "name email role").lean();

  if (!targetUser) {
    return jsonError("User not found", 404);
  }

  const balance = await getOrCreateLeaveBalance(userId, year);
  const used = ensureUsedShape(balance.used);
  const nextAllocated = {
    ...normalizeAllocatedDays(balance.allocated),
    ...normalizeAllocatedDays(allocated),
  };

  for (const leaveType of LEAVE_TYPES) {
    if (nextAllocated[leaveType] < used[leaveType]) {
      return jsonError(
        `Allocated ${leaveType} days cannot be less than already used days (${used[leaveType]})`,
        400,
      );
    }
  }

  balance.allocated = nextAllocated;
  await balance.save();
  await balance.populate("user", "name email role");

  await recordAuditLog({
    actorId: auth.user._id,
    action: "leave-balance.update",
    entityType: "leave-balance",
    entityId: balance._id,
    meta: { userId, year, allocated: nextAllocated },
    request,
  });

  return NextResponse.json({ balance: formatBalanceDoc(balance.toObject()) }, { status: 200 });
}
