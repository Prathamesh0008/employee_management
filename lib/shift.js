import { DEFAULT_SHIFT_RULES } from "@/lib/constants";
import { getUtcDateStart } from "@/lib/date";

export function getDefaultShiftTypeForUser(user) {
  if (user?.shiftType) {
    return user.shiftType;
  }

  if (user?.gender === "female") {
    return "women-day";
  }

  return "men-day";
}

export function getShiftRuleByType(type) {
  return DEFAULT_SHIFT_RULES[type] || DEFAULT_SHIFT_RULES["men-day"];
}

export function getShiftScheduleForDate(date, shiftType) {
  const day = getUtcDateStart(date);
  const rule = getShiftRuleByType(shiftType);
  const scheduledStart = new Date(day);
  scheduledStart.setUTCHours(rule.startHour, 0, 0, 0);

  const scheduledEnd = new Date(day);
  const endHour = rule.endHour;
  if (endHour <= rule.startHour) {
    scheduledEnd.setUTCDate(scheduledEnd.getUTCDate() + 1);
  }
  scheduledEnd.setUTCHours(endHour, 0, 0, 0);

  return {
    scheduledStart,
    scheduledEnd,
    weeklyOffDays: Array.isArray(rule.weeklyOffDays) ? rule.weeklyOffDays : [0],
  };
}

export async function resolveShiftForUserAndDate(user, date) {
  const day = getUtcDateStart(date);
  const shiftType = getDefaultShiftTypeForUser(user);
  const schedule = getShiftScheduleForDate(day, shiftType);
  const weeklyOffDays =
    Array.isArray(user?.weeklyOffDays) && user.weeklyOffDays.length
      ? user.weeklyOffDays
      : schedule.weeklyOffDays;

  return {
    shiftType,
    scheduledStart: schedule.scheduledStart,
    scheduledEnd: schedule.scheduledEnd,
    weeklyOffDays,
  };
}
