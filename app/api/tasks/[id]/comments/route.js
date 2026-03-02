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
import { notifyUser } from "@/lib/notify";
import Task from "@/models/Task";

const createCommentSchema = z.object({
  message: z.string().trim().min(1).max(1500),
});

export async function POST(request, { params }) {
  const auth = await requireApiAuth(request, [ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.BOSS]);

  if (auth.error) {
    return auth.error;
  }

  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "task-comment-create",
    identifier: String(auth.user._id),
    limit: 60,
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

  const validation = createCommentSchema.safeParse({
    message: normalizeText(parsed.data.message),
  });

  if (!validation.success) {
    return jsonError("Invalid comment payload", 422, validation.error.flatten());
  }

  await connectDB();

  const task = await Task.findById(taskId)
    .populate("assignedTo", "name email role")
    .populate("assignedBy", "name email role");

  if (!task) {
    return jsonError("Task not found", 404);
  }

  const userId = String(auth.user._id);
  const canComment =
    auth.user.role === ROLES.BOSS ||
    String(task.assignedTo?._id || task.assignedTo) === userId ||
    String(task.assignedBy?._id || task.assignedBy) === userId;

  if (!canComment) {
    return jsonError("Forbidden", 403);
  }

  task.comments.push({
    author: auth.user._id,
    message: validation.data.message,
    createdAt: new Date(),
  });
  await task.save();

  const updatedTask = await Task.findById(task._id)
    .populate("assignedTo", "name email role")
    .populate("assignedBy", "name email role")
    .populate("comments.author", "name email role")
    .lean();

  const recipient =
    String(task.assignedTo?._id || task.assignedTo) === userId ? task.assignedBy : task.assignedTo;
  const commenterLabel = auth.user.role === ROLES.EMPLOYEE ? "Employee" : "Manager";

  await recordAuditLog({
    actorId: auth.user._id,
    action: "task.comment.create",
    entityType: "task",
    entityId: task._id,
    meta: { commentLength: validation.data.message.length },
    request,
  });

  if (recipient?._id) {
    await notifyUser({
      userId: recipient._id,
      email: recipient.email,
      title: `${commenterLabel} commented on a task`,
      message: `${auth.user.name} commented on "${task.title}".`,
      type: "task-comment",
      meta: {
        taskId: String(task._id),
        taskTitle: task.title,
        priority: task.priority,
        commentedByName: auth.user.name,
      },
      sendMail: true,
    });
  }

  return NextResponse.json({ message: "Comment added", task: updatedTask }, { status: 201 });
}
