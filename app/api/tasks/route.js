import { NextResponse } from "next/server";
import { z } from "zod";

import {
  enforceRateLimit,
  getPagination,
  isValidObjectId,
  jsonError,
  normalizeText,
  parseDateOnly,
  requireApiAuth,
  safeJsonParse,
} from "@/lib/api";
import { recordAuditLog } from "@/lib/audit";
import { ROLES, TASK_PRIORITIES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { notifyUser } from "@/lib/notify";
import Task from "@/models/Task";
import User from "@/models/User";

const createTaskSchema = z.object({
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().min(2).max(2000),
  assignedTo: z.string().trim().min(1),
  priority: z.enum(TASK_PRIORITIES).default("medium"),
  taskDate: z.string().trim().min(1),
});

export async function GET(request) {
  const auth = await requireApiAuth(request);

  if (auth.error) {
    return auth.error;
  }

  const user = auth.user;
  const filter = {};

  if (user.role === ROLES.MANAGER) {
    filter.assignedBy = user._id;
  }

  if (user.role === ROLES.EMPLOYEE) {
    filter.assignedTo = user._id;
  }

  await connectDB();
  const url = new URL(request.url);
  const { page, limit, skip } = getPagination(url.searchParams, { defaultLimit: 20, maxLimit: 100 });
  const total = await Task.countDocuments(filter);

  const tasks = await Task.find(filter)
    .sort({ taskDate: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("assignedTo", "name email role")
    .populate("assignedBy", "name email role")
    .lean();

  return NextResponse.json(
    {
      tasks,
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

export async function POST(request) {
  const auth = await requireApiAuth(request, [ROLES.MANAGER]);

  if (auth.error) {
    return auth.error;
  }

  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "tasks-create",
    identifier: String(auth.user._id),
    limit: 60,
    windowMs: 60 * 1000,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const parsed = await safeJsonParse(request);

  if (parsed.error) {
    return parsed.error;
  }

  const validation = createTaskSchema.safeParse({
    title: normalizeText(parsed.data.title),
    description: normalizeText(parsed.data.description),
    assignedTo: normalizeText(parsed.data.assignedTo),
    priority: normalizeText(parsed.data.priority || "medium"),
    taskDate: normalizeText(parsed.data.taskDate),
  });

  if (!validation.success) {
    return jsonError("Invalid task payload", 422, validation.error.flatten());
  }

  const { title, description, assignedTo, priority, taskDate: taskDateInput } = validation.data;
  const taskDate = parseDateOnly(taskDateInput);

  if (!taskDate) {
    return jsonError("taskDate must be a valid date", 422);
  }

  if (!isValidObjectId(assignedTo)) {
    return jsonError("assignedTo must be a valid user id", 400);
  }

  await connectDB();

  const employee = await User.findOne({ _id: assignedTo, role: ROLES.EMPLOYEE }, "name email role")
    .lean();

  if (!employee) {
    return jsonError("Task can only be assigned to an employee", 400);
  }

  const task = await Task.create({
    title,
    description,
    assignedTo,
    assignedBy: auth.user._id,
    priority,
    taskDate,
  });

  const populatedTask = await Task.findById(task._id)
    .populate("assignedTo", "name email role")
    .populate("assignedBy", "name email role")
    .lean();

  await recordAuditLog({
    actorId: auth.user._id,
    action: "task.create",
    entityType: "task",
    entityId: task._id,
    meta: { assignedTo, priority, taskDate },
    request,
  });

  await notifyUser({
    userId: assignedTo,
    email: employee.email,
    title: "New Task Assigned",
    message: `${auth.user.name} assigned you a task: ${title}`,
    type: "task-assigned",
    meta: { taskId: String(task._id), taskDate },
    sendMail: true,
  });

  return NextResponse.json(
    { message: "Task assigned successfully", task: populatedTask },
    { status: 201 },
  );
}
