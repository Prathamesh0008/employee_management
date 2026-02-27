import mongoose from "mongoose";

import { GENDERS, ROLES, SHIFT_TYPES } from "@/lib/constants";

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      required: true,
    },
    gender: {
      type: String,
      enum: GENDERS,
      default: "male",
      index: true,
    },
    department: {
      type: String,
      trim: true,
      default: "General",
      maxlength: 80,
    },
    designation: {
      type: String,
      trim: true,
      default: "Staff",
      maxlength: 80,
    },
    employeeCode: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 30,
      default: null,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 30,
      default: "",
    },
    baseSalary: {
      type: Number,
      min: 0,
      default: 0,
    },
    shiftType: {
      type: String,
      enum: SHIFT_TYPES,
      default: "men-day",
      index: true,
    },
    weeklyOffDays: {
      type: [Number],
      default: [0],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.every((day) => Number.isInteger(day) && day >= 0 && day <= 6);
        },
        message: "weeklyOffDays must contain integers between 0 and 6",
      },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

UserSchema.index({ employeeCode: 1 }, { unique: true, sparse: true });

const User = mongoose.models.User || mongoose.model("User", UserSchema);

export default User;
