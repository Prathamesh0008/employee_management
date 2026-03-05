export const ROLES = {
  BOSS: "boss",
  MANAGER: "manager",
  EMPLOYEE: "employee",
};

export const ROLE_VALUES = Object.values(ROLES);
export const GENDERS = ["male", "female", "other"];

export const TASK_STATUSES = ["pending", "in-progress", "completed"];
export const TASK_PRIORITIES = ["low", "medium", "high"];
export const BREAK_TYPES = ["morning", "lunch", "afternoon"];
export const BREAK_STATUSES = ["active", "completed"];
export const BREAK_MINUTES_LIMIT = {
  morning: 15,
  lunch: 30,
  afternoon: 15,
};
export const LEAVE_TYPES = ["casual", "sick", "paid", "unpaid"];
export const LEAVE_STATUSES = ["pending", "approved", "rejected", "cancelled"];
export const REIMBURSEMENT_STATUSES = ["pending", "approved", "rejected"];
export const SHIFT_TYPES = ["women-day", "men-day"];

export const AUTH_COOKIE_NAME = "auth_token";
export const CSRF_COOKIE_NAME = "csrf_token";
export const TOKEN_TTL_SECONDS = 60 * 60 * 8;

export const DASHBOARD_BY_ROLE = {
  [ROLES.BOSS]: "/boss/dashboard",
  [ROLES.MANAGER]: "/manager/dashboard",
  [ROLES.EMPLOYEE]: "/employee/dashboard",
};

export const DEFAULT_SHIFT_RULES = {
  "women-day": {
    label: "Women Shift",
    startHour: 9,
    endHour: 18,
    weeklyOffDays: [0],
  },
  "men-day": {
    label: "Men Shift",
    startHour: 10,
    endHour: 19,
    weeklyOffDays: [0],
  },
};
