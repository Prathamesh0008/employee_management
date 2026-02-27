import LeaveBalance from "@/models/LeaveBalance";

export const DEFAULT_LEAVE_ALLOCATIONS = {
  casual: Number(process.env.LEAVE_CASUAL_DAYS || 12),
  sick: Number(process.env.LEAVE_SICK_DAYS || 8),
  paid: Number(process.env.LEAVE_PAID_DAYS || 15),
  unpaid: Number(process.env.LEAVE_UNPAID_DAYS || 365),
};

function sanitizeDays(value, fallback) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

export function normalizeAllocatedDays(payload = {}) {
  return {
    casual: sanitizeDays(payload.casual, DEFAULT_LEAVE_ALLOCATIONS.casual),
    sick: sanitizeDays(payload.sick, DEFAULT_LEAVE_ALLOCATIONS.sick),
    paid: sanitizeDays(payload.paid, DEFAULT_LEAVE_ALLOCATIONS.paid),
    unpaid: sanitizeDays(payload.unpaid, DEFAULT_LEAVE_ALLOCATIONS.unpaid),
  };
}

export function ensureUsedShape(payload = {}) {
  return {
    casual: sanitizeDays(payload.casual, 0),
    sick: sanitizeDays(payload.sick, 0),
    paid: sanitizeDays(payload.paid, 0),
    unpaid: sanitizeDays(payload.unpaid, 0),
  };
}

export const ensureBalanceShape = ensureUsedShape;

export function calculateRemaining(balance) {
  const allocated = normalizeAllocatedDays(balance?.allocated);
  const carryForward = ensureBalanceShape(balance?.carryForward);
  const accrued = ensureBalanceShape(balance?.accrued);
  const used = ensureUsedShape(balance?.used);
  const encashed = ensureBalanceShape(balance?.encashed);

  return {
    casual: Math.max(0, allocated.casual + carryForward.casual + accrued.casual - used.casual - encashed.casual),
    sick: Math.max(0, allocated.sick + carryForward.sick + accrued.sick - used.sick - encashed.sick),
    paid: Math.max(0, allocated.paid + carryForward.paid + accrued.paid - used.paid - encashed.paid),
    unpaid: Math.max(0, allocated.unpaid + carryForward.unpaid + accrued.unpaid - used.unpaid - encashed.unpaid),
  };
}

export async function getOrCreateLeaveBalance(userId, year) {
  const existing = await LeaveBalance.findOne({ user: userId, year });

  if (existing) {
    return existing;
  }

  return LeaveBalance.create({
    user: userId,
    year,
    allocated: normalizeAllocatedDays(),
    carryForward: ensureBalanceShape(),
    accrued: ensureBalanceShape(),
    used: ensureUsedShape(),
    encashed: ensureBalanceShape(),
    lastAccrualMonth: 0,
  });
}

export function consumeLeaveDays(balance, leaveType, days) {
  const remaining = calculateRemaining(balance)[leaveType] || 0;

  if (remaining < days) {
    return { ok: false, remaining };
  }

  const used = ensureUsedShape(balance.used);
  used[leaveType] = used[leaveType] + days;
  balance.used = used;

  return { ok: true, remaining: remaining - days };
}
