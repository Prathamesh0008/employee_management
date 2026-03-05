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
import { REIMBURSEMENT_STATUSES, ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { notifyUser } from "@/lib/notify";
import Reimbursement from "@/models/Reimbursement";

const reviewReimbursementSchema = z.object({
  status: z.enum(REIMBURSEMENT_STATUSES.filter((status) => status !== "pending")),
  reviewerComment: z.string().trim().max(500).optional().default(""),
});

export async function PATCH(request, { params }) {
  const auth = await requireApiAuth(request, [ROLES.BOSS]);

  if (auth.error) {
    return auth.error;
  }

  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "reimbursements-review",
    identifier: String(auth.user._id),
    limit: 60,
    windowMs: 60 * 1000,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const resolvedParams = await params;
  const reimbursementId = resolvedParams.id;

  if (!isValidObjectId(reimbursementId)) {
    return jsonError("Invalid reimbursement id", 400);
  }

  const parsed = await safeJsonParse(request);

  if (parsed.error) {
    return parsed.error;
  }

  const validation = reviewReimbursementSchema.safeParse({
    status: normalizeText(parsed.data.status),
    reviewerComment: normalizeText(parsed.data.reviewerComment),
  });

  if (!validation.success) {
    return jsonError("Invalid reimbursement review payload", 422, validation.error.flatten());
  }

  await connectDB();

  const reimbursement = await Reimbursement.findById(reimbursementId).populate(
    "user",
    "name email role",
  );

  if (!reimbursement) {
    return jsonError("Reimbursement not found", 404);
  }

  if (reimbursement.status !== "pending") {
    return jsonError("This reimbursement has already been reviewed", 409);
  }

  reimbursement.status = validation.data.status;
  reimbursement.reviewerComment = validation.data.reviewerComment || "";
  reimbursement.reviewedBy = auth.user._id;
  reimbursement.reviewedAt = new Date();
  await reimbursement.save();

  const updatedReimbursement = await Reimbursement.findById(reimbursement._id)
    .populate("user", "name email role")
    .populate("reviewedBy", "name email role")
    .lean();

  await recordAuditLog({
    actorId: auth.user._id,
    action: "reimbursement.review",
    entityType: "reimbursement",
    entityId: reimbursement._id,
    meta: {
      status: validation.data.status,
      reviewerComment: validation.data.reviewerComment || "",
      employeeId: reimbursement.user?._id,
    },
    request,
  });

  await notifyUser({
    userId: reimbursement.user?._id,
    email: reimbursement.user?.email,
    title:
      validation.data.status === "approved"
        ? "Reimbursement approved"
        : "Reimbursement rejected",
    message:
      validation.data.status === "approved"
        ? `${auth.user.name} approved your reimbursement request for Rs. ${reimbursement.amount}.`
        : `${auth.user.name} rejected your reimbursement request for Rs. ${reimbursement.amount}.`,
    type:
      validation.data.status === "approved"
        ? "reimbursement-approved"
        : "reimbursement-rejected",
    meta: {
      reimbursementId: String(reimbursement._id),
      amount: reimbursement.amount,
      reviewerComment: validation.data.reviewerComment || "",
      reviewedByName: auth.user.name,
    },
  });

  return NextResponse.json(
    {
      message: `Reimbursement ${validation.data.status}`,
      reimbursement: updatedReimbursement,
    },
    { status: 200 },
  );
}

export async function GET(request, { params }) {
  const auth = await requireApiAuth(request, [ROLES.EMPLOYEE, ROLES.BOSS]);

  if (auth.error) {
    return auth.error;
  }

  const resolvedParams = await params;
  const reimbursementId = resolvedParams.id;

  if (!isValidObjectId(reimbursementId)) {
    return jsonError("Invalid reimbursement id", 400);
  }

  await connectDB();

  const query = { _id: reimbursementId };

  if (auth.user.role === ROLES.EMPLOYEE) {
    query.user = auth.user._id;
  }

  const reimbursement = await Reimbursement.findOne(query)
    .populate("user", "name email role")
    .populate("reviewedBy", "name email role")
    .lean();

  if (!reimbursement) {
    return jsonError("Reimbursement not found", 404);
  }

  return NextResponse.json({ reimbursement }, { status: 200 });
}
