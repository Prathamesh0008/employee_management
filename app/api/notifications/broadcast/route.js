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
import { ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { createNotifications } from "@/lib/notify";
import User from "@/models/User";

const broadcastSchema = z.object({
  title: z.string().trim().min(3).max(140),
  message: z.string().trim().min(3).max(1000),
  audience: z.enum(["all", "employees", "managers"]).optional().default("all"),
});

function resolveRoleFilter(actorRole, audience) {
  if (actorRole === ROLES.BOSS) {
    if (audience === "employees") {
      return [ROLES.EMPLOYEE];
    }

    if (audience === "managers") {
      return [ROLES.MANAGER];
    }

    return [ROLES.MANAGER, ROLES.EMPLOYEE];
  }

  if (actorRole === ROLES.MANAGER) {
    return [ROLES.EMPLOYEE];
  }

  return [];
}

export async function POST(request) {
  const auth = await requireApiAuth(request, [ROLES.BOSS, ROLES.MANAGER]);

  if (auth.error) {
    return auth.error;
  }

  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "notifications-broadcast",
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

  const validation = broadcastSchema.safeParse({
    title: normalizeText(parsed.data.title),
    message: normalizeText(parsed.data.message),
    audience: normalizeText(parsed.data.audience || "all"),
  });

  if (!validation.success) {
    return jsonError("Invalid broadcast payload", 422, validation.error.flatten());
  }

  await connectDB();

  const rolesFilter = resolveRoleFilter(auth.user.role, validation.data.audience);

  if (!rolesFilter.length) {
    return jsonError("Forbidden", 403);
  }

  const recipients = await User.find(
    {
      role: { $in: rolesFilter },
      _id: { $ne: auth.user._id },
    },
    "_id",
  ).lean();

  if (!recipients.length) {
    return NextResponse.json({ message: "No recipients found", sentCount: 0 }, { status: 200 });
  }

  await createNotifications({
    userIds: recipients.map((user) => user._id),
    title: validation.data.title,
    message: validation.data.message,
    type: "broadcast-message",
    meta: {
      sentBy: String(auth.user._id),
      senderRole: auth.user.role,
      audience: validation.data.audience,
    },
  });

  await recordAuditLog({
    actorId: auth.user._id,
    action: "notification.broadcast",
    entityType: "notification",
    entityId: null,
    meta: {
      sentCount: recipients.length,
      audience: validation.data.audience,
    },
    request,
  });

  return NextResponse.json(
    { message: "Broadcast sent successfully", sentCount: recipients.length },
    { status: 201 },
  );
}
