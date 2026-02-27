import mongoose from "mongoose";

const AuditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
      index: true,
    },
    entityId: {
      type: String,
      default: "",
      trim: true,
      maxlength: 120,
      index: true,
    },
    ip: {
      type: String,
      default: "",
      trim: true,
      maxlength: 80,
    },
    userAgent: {
      type: String,
      default: "",
      trim: true,
      maxlength: 300,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

const AuditLog = mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);

export default AuditLog;
