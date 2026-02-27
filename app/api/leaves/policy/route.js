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
import { ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { applyCarryForward, applyMonthlyAccrual } from "@/lib/leave-policy";
import { getOrCreateLeaveBalance } from "@/lib/leave-balance";
import LeaveBalance from "@/models/LeaveBalance";
import User from "@/models/User";

const policyRunSchema = z.object({
  userId: z.string().trim().optional(),
  year: z.number().int().min(2000).max(2100).optional(),
  month: z.number().int().min(1).max(12).optional(),
  applyCarryForward: z.boolean().optional().default(true),
});

export async function POST(request) {
  const auth = await requireApiAuth(request, [ROLES.MANAGER]);

  if (auth.error) {
    return auth.error;
  }

  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "leaves-policy",
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

  const validation = policyRunSchema.safeParse({
    userId: normalizeText(parsed.data.userId),
    year: parsed.data.year ? Number(parsed.data.year) : undefined,
    month: parsed.data.month ? Number(parsed.data.month) : undefined,
    applyCarryForward:
      typeof parsed.data.applyCarryForward === "boolean"
        ? parsed.data.applyCarryForward
        : true,
  });

  if (!validation.success) {
    return jsonError("Invalid leave policy payload", 422, validation.error.flatten());
  }

  const year = validation.data.year || new Date().getUTCFullYear();
  const month = validation.data.month || new Date().getUTCMonth() + 1;
  const applyCarry = validation.data.applyCarryForward;
  const userId = validation.data.userId;

  if (userId && !isValidObjectId(userId)) {
    return jsonError("Invalid userId", 400);
  }

  await connectDB();

  const userFilter = userId
    ? { _id: userId, role: { $in: [ROLES.EMPLOYEE, ROLES.MANAGER] } }
    : { role: { $in: [ROLES.EMPLOYEE, ROLES.MANAGER] } };
  const users = await User.find(userFilter, "_id name email role").lean();

  if (!users.length) {
    return jsonError("No users found for policy run", 404);
  }

  const updated = [];

  for (const user of users) {
    const balance = await getOrCreateLeaveBalance(user._id, year);
    const policyMeta = { changed: false };

    if (applyCarry) {
      const previous = await LeaveBalance.findOne({ user: user._id, year: year - 1 });
      const carryMeta = applyCarryForward(balance, previous);
      policyMeta.carryForward = carryMeta;
      policyMeta.changed = policyMeta.changed || carryMeta.changed;
    }

    const accrualMeta = applyMonthlyAccrual(balance, month);
    policyMeta.accrual = accrualMeta;
    policyMeta.changed = policyMeta.changed || accrualMeta.changed;

    if (policyMeta.changed) {
      await balance.save();
    }

    updated.push({
      userId: String(user._id),
      userName: user.name,
      ...policyMeta,
    });
  }

  await recordAuditLog({
    actorId: auth.user._id,
    action: "leave-policy.run",
    entityType: "leave-balance",
    entityId: null,
    meta: { year, month, applyCarry, users: updated.length },
    request,
  });

  return NextResponse.json(
    {
      message: "Leave policy automation completed",
      year,
      month,
      updated,
    },
    { status: 200 },
  );
}
