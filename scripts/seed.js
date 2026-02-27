const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;
const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD;
const ALLOW_RESET = process.env.SEED_ALLOW_RESET === "true";

if (!MONGODB_URI) {
  console.error("MONGODB_URI is missing. Add it to .env.local before seeding.");
  process.exit(1);
}

if (!DEFAULT_PASSWORD || DEFAULT_PASSWORD.length < 8) {
  console.error("SEED_DEFAULT_PASSWORD is required and must be at least 8 characters.");
  process.exit(1);
}

if (!ALLOW_RESET) {
  console.error(
    "Seed is destructive. Set SEED_ALLOW_RESET=true in .env.local to confirm reset.",
  );
  process.exit(1);
}

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["boss", "manager", "employee"],
      required: true,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      default: "male",
    },
    department: {
      type: String,
      default: "General",
    },
    designation: {
      type: String,
      default: "Staff",
    },
    employeeCode: {
      type: String,
      default: null,
    },
    phone: {
      type: String,
      default: "",
    },
    baseSalary: {
      type: Number,
      default: 0,
    },
    shiftType: {
      type: String,
      enum: ["women-day", "men-day"],
      default: "men-day",
    },
    weeklyOffDays: {
      type: [Number],
      default: [0],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

const holidaySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    date: { type: Date, required: true },
    description: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

const User = mongoose.models.User || mongoose.model("User", userSchema);
const Holiday = mongoose.models.Holiday || mongoose.model("Holiday", holidaySchema);

function asUtcDate(value) {
  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

async function seed() {
  await mongoose.connect(MONGODB_URI);

  await Promise.all([
    mongoose.connection.collection("tasks").deleteMany({}),
    mongoose.connection.collection("attendances").deleteMany({}),
    mongoose.connection.collection("breaklogs").deleteMany({}),
    mongoose.connection.collection("leaves").deleteMany({}),
    mongoose.connection.collection("leavebalances").deleteMany({}),
    mongoose.connection.collection("notifications").deleteMany({}),
    mongoose.connection.collection("auditlogs").deleteMany({}),
    Holiday.deleteMany({}),
    User.deleteMany({}),
  ]);

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  const boss = await User.create({
    name: "Company Boss",
    email: "boss@company.local",
    password: hashedPassword,
    role: "boss",
    gender: "male",
    department: "Leadership",
    designation: "Boss",
    employeeCode: "BOSS001",
    baseSalary: 180000,
    shiftType: "men-day",
    weeklyOffDays: [0],
  });

  await User.create({
    name: "Operations Manager",
    email: "manager@company.local",
    password: hashedPassword,
    role: "manager",
    gender: "male",
    department: "Operations",
    designation: "Manager",
    employeeCode: "MGR001",
    baseSalary: 90000,
    shiftType: "men-day",
    weeklyOffDays: [0],
  });

  const employeePayload = Array.from({ length: 10 }).map((_, index) => {
    const serial = String(index + 1).padStart(2, "0");
    const isFemale = index % 2 === 0;
    const department = ["Engineering", "Support", "Sales", "HR", "Finance"][index % 5];

    return {
      name: `Employee ${serial}`,
      email: `employee${serial}@company.local`,
      password: hashedPassword,
      role: "employee",
      gender: isFemale ? "female" : "male",
      department,
      designation: "Executive",
      employeeCode: `EMP${serial}`,
      baseSalary: 25000 + index * 1000,
      shiftType: isFemale ? "women-day" : "men-day",
      weeklyOffDays: [0],
    };
  });

  await User.insertMany(employeePayload);

  const defaultHolidays = [
    {
      title: "Republic Day",
      date: asUtcDate("2026-01-26"),
      description: "National holiday in India",
    },
    {
      title: "Holi",
      date: asUtcDate("2026-03-14"),
      description: "Festival of colors",
    },
    {
      title: "Independence Day",
      date: asUtcDate("2026-08-15"),
      description: "National holiday in India",
    },
    {
      title: "Gandhi Jayanti",
      date: asUtcDate("2026-10-02"),
      description: "Birth anniversary of Mahatma Gandhi",
    },
    {
      title: "Diwali",
      date: asUtcDate("2026-11-12"),
      description: "Festival of lights",
    },
  ].map((holiday) => ({ ...holiday, createdBy: boss._id }));

  await Holiday.insertMany(defaultHolidays);

  console.log("Seed completed successfully.");
  console.log("Credentials:");
  console.log(`- boss@company.local / ${DEFAULT_PASSWORD}`);
  console.log(`- manager@company.local / ${DEFAULT_PASSWORD}`);
  console.log(`- employee01@company.local / ${DEFAULT_PASSWORD}`);

  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error("Seed failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
