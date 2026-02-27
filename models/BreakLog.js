import mongoose from "mongoose";

import { BREAK_STATUSES, BREAK_TYPES } from "@/lib/constants";

const BreakLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    attendance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Attendance",
      default: null,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: BREAK_TYPES,
      required: true,
      index: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      default: null,
    },
    durationMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    allowedMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: BREAK_STATUSES,
      default: "active",
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  },
);

BreakLogSchema.index({ user: 1, date: 1, status: 1 });

const BreakLog = mongoose.models.BreakLog || mongoose.model("BreakLog", BreakLogSchema);

export default BreakLog;
