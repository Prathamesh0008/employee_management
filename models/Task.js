import mongoose from "mongoose";

import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/constants";

const TaskCommentSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      trim: true,
      required: true,
      minlength: 1,
      maxlength: 1500,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true, timestamps: false },
);

const TaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 180,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: TASK_STATUSES,
      default: "pending",
      index: true,
    },
    priority: {
      type: String,
      enum: TASK_PRIORITIES,
      default: "medium",
    },
    taskDate: {
      type: Date,
      required: true,
      index: true,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    completionMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    comments: {
      type: [TaskCommentSchema],
      default: [],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  },
);

if (
  mongoose.models.Task &&
  (
    !mongoose.models.Task.schema.path("comments") ||
    !mongoose.models.Task.schema.path("startedAt") ||
    !mongoose.models.Task.schema.path("completionMinutes")
  )
) {
  delete mongoose.models.Task;
}

const Task = mongoose.models.Task || mongoose.model("Task", TaskSchema);

export default Task;
