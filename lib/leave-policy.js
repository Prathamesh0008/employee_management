import { DEFAULT_LEAVE_ALLOCATIONS, ensureBalanceShape } from "@/lib/leave-balance";

export function getMonthlyAccrualConfig() {
  return {
    casual: Number(process.env.LEAVE_ACCRUAL_CASUAL_MONTHLY || (DEFAULT_LEAVE_ALLOCATIONS.casual / 12).toFixed(2)),
    sick: Number(process.env.LEAVE_ACCRUAL_SICK_MONTHLY || (DEFAULT_LEAVE_ALLOCATIONS.sick / 12).toFixed(2)),
    paid: Number(process.env.LEAVE_ACCRUAL_PAID_MONTHLY || (DEFAULT_LEAVE_ALLOCATIONS.paid / 12).toFixed(2)),
    unpaid: 0,
  };
}

function safeFloor(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.floor(parsed);
}

export function applyMonthlyAccrual(balance, targetMonth) {
  const monthly = getMonthlyAccrualConfig();
  const month = Math.min(12, Math.max(1, safeFloor(targetMonth)));
  const accrual = ensureBalanceShape(balance.accrued);

  if (balance.lastAccrualMonth >= month) {
    return { changed: false, appliedMonth: balance.lastAccrualMonth };
  }

  const monthsToApply = month - balance.lastAccrualMonth;

  accrual.casual += Math.floor(monthly.casual * monthsToApply);
  accrual.sick += Math.floor(monthly.sick * monthsToApply);
  accrual.paid += Math.floor(monthly.paid * monthsToApply);
  balance.accrued = accrual;
  balance.lastAccrualMonth = month;

  return { changed: true, appliedMonth: month, monthsToApply };
}

export function applyCarryForward(currentYearBalance, previousYearBalance) {
  if (!previousYearBalance) {
    return { changed: false };
  }

  const previousCarry = ensureBalanceShape(previousYearBalance.carryForward);
  const previousAllocated = ensureBalanceShape(previousYearBalance.allocated);
  const previousAccrued = ensureBalanceShape(previousYearBalance.accrued);
  const previousUsed = ensureBalanceShape(previousYearBalance.used);
  const previousEncashed = ensureBalanceShape(previousYearBalance.encashed);
  const targetCarry = ensureBalanceShape(currentYearBalance.carryForward);
  const maxCarryPaid = safeFloor(process.env.LEAVE_CARRY_FORWARD_MAX_PAID || 10);

  const paidRemaining = Math.max(
    0,
    previousAllocated.paid + previousCarry.paid + previousAccrued.paid - previousUsed.paid - previousEncashed.paid,
  );
  const casualRemaining = Math.max(
    0,
    previousAllocated.casual + previousCarry.casual + previousAccrued.casual - previousUsed.casual - previousEncashed.casual,
  );
  const sickRemaining = Math.max(
    0,
    previousAllocated.sick + previousCarry.sick + previousAccrued.sick - previousUsed.sick - previousEncashed.sick,
  );

  targetCarry.paid = Math.min(maxCarryPaid, paidRemaining);
  targetCarry.casual = Math.min(5, casualRemaining);
  targetCarry.sick = Math.min(5, sickRemaining);
  currentYearBalance.carryForward = targetCarry;

  return { changed: true, carryForward: targetCarry };
}

export function applyEncashment(balance, leaveType, days) {
  const encashed = ensureBalanceShape(balance.encashed);
  encashed[leaveType] += safeFloor(days);
  balance.encashed = encashed;
}
