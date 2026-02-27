import mongoose from "mongoose";

import { LEAVE_STATUSES, LEAVE_TYPES } from "@/lib/constants";

const LeaveSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    fromDate: {
      type: Date,
      required: true,
      index: true,
    },
    toDate: {
      type: Date,
      required: true,
      index: true,
    },
    leaveType: {
      type: String,
      enum: LEAVE_TYPES,
      default: "casual",
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: LEAVE_STATUSES,
      default: "pending",
      index: true,
    },
    totalDays: {
      type: Number,
      required: true,
      min: 1,
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

const Leave = mongoose.models.Leave || mongoose.model("Leave", LeaveSchema);

export default Leave;
