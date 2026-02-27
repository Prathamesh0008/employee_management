import mongoose from "mongoose";

const BalanceSchema = new mongoose.Schema(
  {
    casual: { type: Number, default: 12, min: 0 },
    sick: { type: Number, default: 8, min: 0 },
    paid: { type: Number, default: 15, min: 0 },
    unpaid: { type: Number, default: 365, min: 0 },
  },
  { _id: false },
);

const LeaveBalanceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    year: {
      type: Number,
      required: true,
      index: true,
      min: 2000,
      max: 2100,
    },
    allocated: {
      type: BalanceSchema,
      default: () => ({}),
    },
    carryForward: {
      type: BalanceSchema,
      default: () => ({ casual: 0, sick: 0, paid: 0, unpaid: 0 }),
    },
    accrued: {
      type: BalanceSchema,
      default: () => ({ casual: 0, sick: 0, paid: 0, unpaid: 0 }),
    },
    used: {
      type: BalanceSchema,
      default: () => ({ casual: 0, sick: 0, paid: 0, unpaid: 0 }),
    },
    encashed: {
      type: BalanceSchema,
      default: () => ({ casual: 0, sick: 0, paid: 0, unpaid: 0 }),
    },
    lastAccrualMonth: {
      type: Number,
      default: 0,
      min: 0,
      max: 12,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  },
);

LeaveBalanceSchema.index({ user: 1, year: 1 }, { unique: true });

const LeaveBalance =
  mongoose.models.LeaveBalance || mongoose.model("LeaveBalance", LeaveBalanceSchema);

export default LeaveBalance;
