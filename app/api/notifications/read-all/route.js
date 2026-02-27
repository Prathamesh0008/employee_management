import { NextResponse } from "next/server";

import { enforceRateLimit, requireApiAuth } from "@/lib/api";
import connectDB from "@/lib/db";
import Notification from "@/models/Notification";

export async function POST(request) {
  const auth = await requireApiAuth(request);

  if (auth.error) {
    return auth.error;
  }

  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "notifications-read-all",
    identifier: String(auth.user._id),
    limit: 50,
    windowMs: 60 * 1000,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  await connectDB();

  await Notification.updateMany(
    { user: auth.user._id, isRead: false },
    { $set: { isRead: true, readAt: new Date() } },
  );

  return NextResponse.json({ message: "All notifications marked as read" }, { status: 200 });
}
