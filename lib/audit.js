import connectDB from "@/lib/db";
import AuditLog from "@/models/AuditLog";

export async function recordAuditLog({
  actorId = null,
  action,
  entityType,
  entityId = "",
  meta = {},
  request,
}) {
  if (!action || !entityType) {
    return;
  }

  const ip =
    request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request?.headers.get("x-real-ip") ||
    "";

  const userAgent = request?.headers.get("user-agent") || "";

  try {
    await connectDB();

    await AuditLog.create({
      actor: actorId,
      action,
      entityType,
      entityId: entityId ? String(entityId) : "",
      ip,
      userAgent,
      meta,
    });
  } catch {
    // Logging failures should not block the main request lifecycle.
  }
}
