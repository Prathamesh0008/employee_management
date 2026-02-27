import { NextResponse } from "next/server";

import { getPagination, normalizeText, requireApiAuth } from "@/lib/api";
import connectDB from "@/lib/db";
import Notification from "@/models/Notification";

export async function GET(request) {
  const auth = await requireApiAuth(request);

  if (auth.error) {
    return auth.error;
  }

  await connectDB();

  const url = new URL(request.url);
  const unreadOnly = normalizeText(url.searchParams.get("unread")) === "true";
  const filter = { user: auth.user._id };

  if (unreadOnly) {
    filter.isRead = false;
  }

  const { page, limit, skip } = getPagination(url.searchParams, { defaultLimit: 20, maxLimit: 100 });
  const [total, unreadCount, notifications] = await Promise.all([
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: auth.user._id, isRead: false }),
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return NextResponse.json(
    {
      notifications,
      unreadCount,
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
