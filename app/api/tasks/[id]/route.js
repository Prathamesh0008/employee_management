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

  const task = await Task.findOne({ _id: taskId, assignedTo: auth.user._id });

  if (!task) {
    return jsonError("Task not found", 404);
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
    meta: { status },
    request,
  });

  return NextResponse.json(
    { message: "Task status updated", task: updatedTask },
    { status: 200 },
  );
}
