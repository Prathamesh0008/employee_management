import { NextResponse } from "next/server";
import { z } from "zod";

import {
  enforceRateLimit,
  isValidObjectId,
  jsonError,
  requireApiAuth,
  safeJsonParse,
} from "@/lib/api";
import connectDB from "@/lib/db";
import Notification from "@/models/Notification";

const notificationUpdateSchema = z.object({
  isRead: z.boolean(),
});

export async function PATCH(request, { params }) {
  const auth = await requireApiAuth(request);

  if (auth.error) {
    return auth.error;
  }

  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "notifications-update",
    identifier: String(auth.user._id),
    limit: 120,
    windowMs: 60 * 1000,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const resolvedParams = await params;
  const notificationId = resolvedParams.id;

  if (!isValidObjectId(notificationId)) {
    return jsonError("Invalid notification id", 400);
  }

  const parsed = await safeJsonParse(request);

  if (parsed.error) {
    return parsed.error;
  }

  const validation = notificationUpdateSchema.safeParse(parsed.data);

  if (!validation.success) {
    return jsonError("Invalid notification payload", 422, validation.error.flatten());
  }

  await connectDB();

  const notification = await Notification.findOne({
    _id: notificationId,
    user: auth.user._id,
  });

  if (!notification) {
    return jsonError("Notification not found", 404);
  }

  notification.isRead = validation.data.isRead;
  notification.readAt = validation.data.isRead ? new Date() : null;
  await notification.save();

  return NextResponse.json({ notification }, { status: 200 });
}
