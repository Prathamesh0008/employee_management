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
import { LEAVE_STATUSES, ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { consumeLeaveDays, getOrCreateLeaveBalance } from "@/lib/leave-balance";
import { notifyUser } from "@/lib/notify";
import Leave from "@/models/Leave";
import User from "@/models/User";

const leaveUpdateSchema = z.object({
  status: z.enum(LEAVE_STATUSES),
  reviewerComment: z.string().trim().max(500).optional().default(""),
});

export async function PATCH(request, { params }) {
  const auth = await requireApiAuth(request);

  if (auth.error) {
    return auth.error;
  }

  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "leaves-update",
    identifier: String(auth.user._id),
    limit: 40,
    windowMs: 60 * 1000,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const parsed = await safeJsonParse(request);

  if (parsed.error) {
    return parsed.error;
  }

  const validation = leaveUpdateSchema.safeParse({
    status: normalizeText(parsed.data.status),
    reviewerComment: normalizeText(parsed.data.reviewerComment),
  });

  if (!validation.success) {
    return jsonError("Invalid leave update payload", 422, validation.error.flatten());
  }

  const { status: requestedStatus, reviewerComment } = validation.data;

  const resolvedParams = await params;
  const leaveId = resolvedParams.id;

  if (!isValidObjectId(leaveId)) {
    return NextResponse.json({ error: "Invalid leave id" }, { status: 400 });
  }

  await connectDB();

  const leave = await Leave.findById(leaveId);

  if (!leave) {
    return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
  }

  const leaveOwner = await User.findById(leave.user, "name email role").lean();

  if (!leaveOwner) {
    return NextResponse.json({ error: "Leave owner not found" }, { status: 404 });
  }

  if (auth.user.role === ROLES.EMPLOYEE) {
    if (String(leave.user) !== String(auth.user._id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (leave.status !== "pending") {
      return NextResponse.json(
        { error: "Only pending leave can be cancelled" },
        { status: 400 },
      );
    }

    if (requestedStatus !== "cancelled") {
      return NextResponse.json(
        { error: "Employees can only cancel their leave request" },
        { status: 400 },
      );
    }

    leave.status = "cancelled";
    leave.reviewerComment = reviewerComment;
    leave.reviewedBy = auth.user._id;
    leave.reviewedAt = new Date();
    await leave.save();
  } else if (auth.user.role === ROLES.MANAGER) {
    if (!["approved", "rejected"].includes(requestedStatus)) {
      return NextResponse.json(
        { error: "Status must be approved or rejected" },
        { status: 400 },
      );
    }

    if (leave.status !== "pending") {
      return NextResponse.json(
        { error: "Only pending leave can be reviewed" },
        { status: 400 },
      );
    }

    if (requestedStatus === "approved") {
      if (leave.fromDate.getUTCFullYear() !== leave.toDate.getUTCFullYear()) {
        return NextResponse.json(
          { error: "Leave range must stay within a single year" },
          { status: 400 },
        );
      }

      const balance = await getOrCreateLeaveBalance(leave.user, leave.fromDate.getUTCFullYear());
      const consumeResult = consumeLeaveDays(balance, leave.leaveType, leave.totalDays);

      if (!consumeResult.ok) {
        return NextResponse.json(
          {
            error: `Insufficient ${leave.leaveType} leave balance. Remaining: ${consumeResult.remaining} day(s)`,
          },
          { status: 400 },
        );
      }

      await balance.save();
    }

    leave.status = requestedStatus;
    leave.reviewerComment = reviewerComment;
    leave.reviewedBy = auth.user._id;
    leave.reviewedAt = new Date();
    await leave.save();
  } else if (auth.user.role === ROLES.BOSS) {
    return NextResponse.json(
      { error: "Only manager can approve or reject leave requests" },
      { status: 403 },
    );
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const populated = await Leave.findById(leave._id)
    .populate("user", "name email role")
    .populate("reviewedBy", "name email role")
    .lean();

  await recordAuditLog({
    actorId: auth.user._id,
    action: "leave.update-status",
    entityType: "leave",
    entityId: leave._id,
    meta: { status: leave.status, reviewerComment },
    request,
  });

  await notifyUser({
    userId: leave.user,
    email: leaveOwner.email,
    title: "Leave Request Updated",
    message: `Your leave request is ${leave.status}.`,
    type: "leave-status-updated",
    meta: {
      leaveId: String(leave._id),
      status: leave.status,
      reviewerComment,
    },
    sendMail: true,
  });

  return NextResponse.json({ message: "Leave updated", leave: populated }, { status: 200 });
}
