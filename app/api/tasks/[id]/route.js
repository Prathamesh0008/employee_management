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
import { ROLES, TASK_STATUSES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { notifyUser } from "@/lib/notify";
import Task from "@/models/Task";

const updateTaskStatusSchema = z.object({
  status: z.enum(TASK_STATUSES),
});

export async function PATCH(request, { params }) {
  const auth = await requireApiAuth(request, [ROLES.EMPLOYEE]);

  if (auth.error) {
    return auth.error;
  }

  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "tasks-update",
    identifier: String(auth.user._id),
    limit: 100,
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

  const parsed = await safeJsonParse(request);

  if (parsed.error) {
    return parsed.error;
  }

  const validation = updateTaskStatusSchema.safeParse({
    status: normalizeText(parsed.data.status),
  });

  if (!validation.success) {
    return jsonError("Invalid task status payload", 422, validation.error.flatten());
  }

  const { status } = validation.data;

  await connectDB();

  const task = await Task.findOne({ _id: taskId, assignedTo: auth.user._id })
    .populate("assignedBy", "name email role");

  if (!task) {
    return jsonError("Task not found", 404);
  }

  const now = new Date();
  const previousStatus = task.status;
  let autoPausedTask = null;

  if (status === "pending") {
    task.startedAt = null;
    task.completedAt = null;
    task.completionMinutes = 0;
  }

  if (status === "in-progress") {
    const activeTask = await Task.findOne({
      assignedTo: auth.user._id,
      status: "in-progress",
      _id: { $ne: task._id },
    }).populate("assignedBy", "name email role");

    if (activeTask) {
      if (task.priority !== "high") {
        return jsonError(
          `You already have "${activeTask.title}" in progress. Complete it before starting another task. Only high priority tasks can override.`,
          409,
          {
            activeTaskId: String(activeTask._id),
            activeTaskTitle: activeTask.title,
          },
        );
      }

      activeTask.status = "pending";
      activeTask.startedAt = null;
      activeTask.completedAt = null;
      activeTask.completionMinutes = 0;
      await activeTask.save();

      autoPausedTask = {
        id: String(activeTask._id),
        title: activeTask.title,
        reason: "auto-paused-for-high-priority",
      };

      await recordAuditLog({
        actorId: auth.user._id,
        action: "task.auto-pause-for-high-priority",
        entityType: "task",
        entityId: activeTask._id,
        meta: {
          replacedByTaskId: String(task._id),
          replacedByTaskTitle: task.title,
          replacedByPriority: task.priority,
        },
        request,
      });

      await notifyUser({
        userId: activeTask.assignedBy?._id,
        email: activeTask.assignedBy?.email,
        title: "Task auto-paused for high priority",
        message: `${auth.user.name} auto-paused "${activeTask.title}" to start high priority task "${task.title}".`,
        type: "task-status-updated",
        meta: {
          taskId: String(activeTask._id),
          status: "pending",
          updatedByName: auth.user.name,
          reason: "auto-paused-for-high-priority",
          replacedByTaskId: String(task._id),
          replacedByTaskTitle: task.title,
        },
      });
    }

    if (!task.startedAt) {
      task.startedAt = now;
    }

    task.completedAt = null;
    task.completionMinutes = 0;
  }

  if (status === "completed") {
    if (!task.startedAt) {
      task.startedAt = now;
    }

    task.completedAt = now;
    task.completionMinutes = Math.max(
      0,
      Math.round((task.completedAt.getTime() - task.startedAt.getTime()) / 60000),
    );
  }

  task.status = status;
  await task.save();

  const updatedTask = await Task.findById(task._id)
    .populate("assignedTo", "name email role")
    .populate("assignedBy", "name email role")
    .lean();

  await recordAuditLog({
    actorId: auth.user._id,
    action: "task.update-status",
    entityType: "task",
    entityId: task._id,
    meta: {
      previousStatus,
      status,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      completionMinutes: task.completionMinutes,
      autoPausedTask,
    },
    request,
  });

  await notifyUser({
    userId: task.assignedBy?._id,
    email: task.assignedBy?.email,
    title: "Task status updated",
    message: `${auth.user.name} marked "${task.title}" as ${status}.`,
    type: "task-status-updated",
    meta: {
      taskId: String(task._id),
      status,
      updatedByName: auth.user.name,
      priority: task.priority,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      completionMinutes: task.completionMinutes,
      autoPausedTask,
    },
  });

  return NextResponse.json(
    {
      message:
        status === "in-progress" && autoPausedTask
          ? `Task status updated. "${autoPausedTask.title}" was auto-paused for this high priority task.`
          : "Task status updated",
      task: updatedTask,
      autoPausedTask,
    },
    { status: 200 },
  );
}

export async function GET(request, { params }) {
  const auth = await requireApiAuth(request);

  if (auth.error) {
    return auth.error;
  }

  const resolvedParams = await params;
  const taskId = resolvedParams.id;

  if (!isValidObjectId(taskId)) {
    return jsonError("Invalid task id", 400);
  }

  await connectDB();

  const query = { _id: taskId };

  if (auth.user.role === ROLES.EMPLOYEE) {
    query.assignedTo = auth.user._id;
  }

  if (auth.user.role === ROLES.MANAGER) {
    query.assignedBy = auth.user._id;
  }

  const task = await Task.findOne(query)
    .populate("assignedTo", "name email role")
    .populate("assignedBy", "name email role")
    .populate("comments.author", "name email role")
    .lean();

  if (!task) {
    return jsonError("Task not found", 404);
  }

  return NextResponse.json({ task }, { status: 200 });
}
