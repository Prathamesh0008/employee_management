import { NextResponse } from "next/server";
import { z } from "zod";

import {
  enforceRateLimit,
  getPagination,
  jsonError,
  normalizeText,
  requireApiAuth,
  safeJsonParse,
} from "@/lib/api";
import { recordAuditLog } from "@/lib/audit";
import { REIMBURSEMENT_STATUSES, ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { notifyRoles } from "@/lib/notify";
import Reimbursement from "@/models/Reimbursement";

const allowedInvoiceMimeTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
];

const createReimbursementSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().min(2).max(1200),
  amount: z.coerce.number().positive().max(1000000),
  invoice: z.object({
    fileName: z.string().trim().min(1).max(180),
    mimeType: z
      .string()
      .trim()
      .refine((value) => allowedInvoiceMimeTypes.includes(value), "Unsupported invoice type"),
    dataUrl: z
      .string()
      .trim()
      .min(20)
      .max(5000000)
      .refine((value) => value.startsWith("data:"), "Invalid invoice data"),
  }),
});

export async function GET(request) {
  const auth = await requireApiAuth(request, [ROLES.EMPLOYEE, ROLES.BOSS]);

  if (auth.error) {
    return auth.error;
  }

  await connectDB();

  const url = new URL(request.url);
  const status = normalizeText(url.searchParams.get("status"));
  const { page, limit, skip } = getPagination(url.searchParams, { defaultLimit: 20, maxLimit: 200 });

  const filter = {};

  if (auth.user.role === ROLES.EMPLOYEE) {
    filter.user = auth.user._id;
  }

  if (status && REIMBURSEMENT_STATUSES.includes(status)) {
    filter.status = status;
  }

  const total = await Reimbursement.countDocuments(filter);
  const reimbursements = await Reimbursement.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("user", "name email role")
    .populate("reviewedBy", "name email role")
    .lean();

  return NextResponse.json(
    {
      reimbursements,
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
  const auth = await requireApiAuth(request, [ROLES.EMPLOYEE]);

  if (auth.error) {
    return auth.error;
  }

  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "reimbursements-create",
    identifier: String(auth.user._id),
    limit: 20,
    windowMs: 60 * 1000,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const parsed = await safeJsonParse(request);

  if (parsed.error) {
    return parsed.error;
  }

  const validation = createReimbursementSchema.safeParse({
    title: normalizeText(parsed.data.title),
    description: normalizeText(parsed.data.description),
    amount: parsed.data.amount,
    invoice: {
      fileName: normalizeText(parsed.data.invoice?.fileName),
      mimeType: normalizeText(parsed.data.invoice?.mimeType),
      dataUrl: normalizeText(parsed.data.invoice?.dataUrl),
    },
  });

  if (!validation.success) {
    return jsonError("Invalid reimbursement payload", 422, validation.error.flatten());
  }

  await connectDB();

  const reimbursement = await Reimbursement.create({
    user: auth.user._id,
    title: validation.data.title,
    description: validation.data.description,
    amount: validation.data.amount,
    invoice: validation.data.invoice,
  });

  const populatedReimbursement = await Reimbursement.findById(reimbursement._id)
    .populate("user", "name email role")
    .populate("reviewedBy", "name email role")
    .lean();

  await recordAuditLog({
    actorId: auth.user._id,
    action: "reimbursement.create",
    entityType: "reimbursement",
    entityId: reimbursement._id,
    meta: {
      amount: validation.data.amount,
      fileName: validation.data.invoice.fileName,
    },
    request,
  });

  await notifyRoles({
    roles: [ROLES.BOSS],
    title: "New reimbursement request",
    message: `${auth.user.name} submitted a reimbursement request for Rs. ${validation.data.amount}.`,
    type: "reimbursement-submitted",
    meta: {
      reimbursementId: String(reimbursement._id),
      employeeName: auth.user.name,
      amount: validation.data.amount,
      title: validation.data.title,
    },
  });

  return NextResponse.json(
    {
      message: "Reimbursement submitted successfully",
      reimbursement: populatedReimbursement,
    },
    { status: 201 },
  );
}
