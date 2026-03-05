import { NextResponse } from "next/server";
import { z } from "zod";

import {
  enforceRateLimit,
  jsonError,
  requireApiAuth,
  safeJsonParse,
} from "@/lib/api";
import { ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import User from "@/models/User";

const drivingModeSchema = z.object({
  drivingMode: z.boolean(),
});

export async function PATCH(request) {
  const auth = await requireApiAuth(request, [ROLES.EMPLOYEE]);

  if (auth.error) {
    return auth.error;
  }

  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "auth-driving-mode",
    identifier: String(auth.user._id),
    limit: 120,
    windowMs: 60 * 1000,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const parsed = await safeJsonParse(request);

  if (parsed.error) {
    return parsed.error;
  }

  const validation = drivingModeSchema.safeParse(parsed.data);

  if (!validation.success) {
    return jsonError("Invalid driving mode payload", 422, validation.error.flatten());
  }

  await connectDB();

  const user = await User.findById(auth.user._id);

  if (!user) {
    return jsonError("User not found", 404);
  }

  user.drivingMode = validation.data.drivingMode;
  await user.save();

  return NextResponse.json(
    {
      message: user.drivingMode ? "Driving mode enabled" : "Driving mode disabled",
      drivingMode: user.drivingMode,
    },
    { status: 200 },
  );
}
