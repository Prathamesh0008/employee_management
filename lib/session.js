import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AUTH_COOKIE_NAME, DASHBOARD_BY_ROLE } from "@/lib/constants";
import { verifyAuthToken } from "@/lib/auth";
import connectDB from "@/lib/db";
import User from "@/models/User";

export function getDashboardPath(role) {
  return DASHBOARD_BY_ROLE[role] || "/login";
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  let payload;

  try {
    payload = await verifyAuthToken(token);
  } catch {
    return null;
  }

  await connectDB();

  const user = await User.findById(payload.sub).select("-password").lean();

  if (!user) {
    return null;
  }

  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    gender: user.gender,
    department: user.department,
    designation: user.designation,
    employeeCode: user.employeeCode,
    shiftType: user.shiftType,
    weeklyOffDays: user.weeklyOffDays,
  };
}

export async function requireUser(requiredRole) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  if (requiredRole && user.role !== requiredRole) {
    redirect(getDashboardPath(user.role));
  }

  return user;
}
