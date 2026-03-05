import mongoose from "mongoose";

import { REIMBURSEMENT_STATUSES } from "@/lib/constants";

const InvoiceSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    dataUrl: {
      type: String,
      required: true,
      maxlength: 5000000,
    },
  },
  {
    _id: false,
  },
);

const ReimbursementSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 160,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1200,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
      max: 1000000,
    },
    invoice: {
      type: InvoiceSchema,
      required: true,
    },
    status: {
      type: String,
      enum: REIMBURSEMENT_STATUSES,
      default: "pending",
      index: true,
    },
    reviewerComment: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  },
);

const Reimbursement =
  mongoose.models.Reimbursement || mongoose.model("Reimbursement", ReimbursementSchema);

export default Reimbursement;
