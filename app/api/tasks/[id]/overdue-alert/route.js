import { NextResponse } from "next/server";

import {
  enforceRateLimit,
  isValidObjectId,
  jsonError,
  requireApiAuth,
} from "@/lib/api";
import { recordAuditLog } from "@/lib/audit";
import { ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { notifyUser } from "@/lib/notify";
import Notification from "@/models/Notification";
import Task from "@/models/Task";

const OVERDUE_ALERT_THRESHOLD_MINUTES = 60;

export async function POST(request, { params }) {
  const auth = await requireApiAuth(request, [ROLES.EMPLOYEE]);

  if (auth.error) {
    return auth.error;
  }

  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "tasks-overdue-alert",
    identifier: String(auth.user._id),
    limit: 120,
    windowMs: 60 * 1000,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const resolvedParams = await params;
  const taskId = resolvedParams.id;

  if (!isValidObjectId(taskId)) {
    return jsonError("Invalid task id", 400);
  }

  await connectDB();

  const task = await Task.findOne({
    _id: taskId,
    assignedTo: auth.user._id,
  }).populate("assignedBy", "name email role");

  if (!task) {
    return jsonError("Task not found", 404);
  }

  if (task.status !== "in-progress" || !task.startedAt) {
    return jsonError("Overdue alert can only be sent for in-progress tasks", 409);
  }

  const elapsedMinutes = Math.floor((Date.now() - new Date(task.startedAt).getTime()) / 60000);

  if (elapsedMinutes < OVERDUE_ALERT_THRESHOLD_MINUTES) {
    return jsonError("Task has not crossed 1 hour yet", 422);
  }

  const existingAlert = await Notification.findOne({
    user: task.assignedBy?._id,
    type: "task-overdue-1h",
    "meta.taskId": String(task._id),
    "meta.alertType": "1-hour-threshold",
  }).lean();

  if (existingAlert) {
    return NextResponse.json(
      { message: "Overdue alert already sent", alreadySent: true },
      { status: 200 },
    );
  }

  await notifyUser({
    userId: task.assignedBy?._id,
    email: task.assignedBy?.email,
    title: "Task exceeded 1 hour",
    message: `${auth.user.name} has worked more than 1 hour on "${task.title}" (${elapsedMinutes} mins).`,
    type: "task-overdue-1h",
    meta: {
      taskId: String(task._id),
      taskTitle: task.title,
      elapsedMinutes,
      employeeId: String(auth.user._id),
      employeeName: auth.user.name,
      alertType: "1-hour-threshold",
    },
  });

  await recordAuditLog({
    actorId: auth.user._id,
    action: "task.overdue-alert",
    entityType: "task",
    entityId: task._id,
    meta: {
      elapsedMinutes,
      thresholdMinutes: OVERDUE_ALERT_THRESHOLD_MINUTES,
      notifiedUserId: task.assignedBy?._id ? String(task.assignedBy._id) : null,
    },
    request,
  });

  return NextResponse.json(
    { message: "Manager notified for overdue task", sent: true },
    { status: 200 },
  );
}
