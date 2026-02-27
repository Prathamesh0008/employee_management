import mongoose from "mongoose";

const AttendanceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    shiftStart: {
      type: Date,
      required: true,
    },
    shiftEnd: {
      type: Date,
      default: null,
    },
    checkIn: {
      type: Date,
      default: null,
    },
    checkOut: {
      type: Date,
      default: null,
    },
    scheduledStart: {
      type: Date,
      default: null,
    },
    scheduledEnd: {
      type: Date,
      default: null,
    },
    shiftType: {
      type: String,
      default: "men-day",
      index: true,
    },
    isLate: {
      type: Boolean,
      default: false,
      index: true,
    },
    lateMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    overtimeMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalWorkMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["present", "half-day", "weekly-off"],
      default: "present",
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  },
);

AttendanceSchema.index({ user: 1, date: 1 }, { unique: true });

const Attendance =
  mongoose.models.Attendance || mongoose.model("Attendance", AttendanceSchema);

export default Attendance;
