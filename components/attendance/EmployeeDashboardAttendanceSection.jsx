"use client";

import { apiFetch } from "@/lib/client-api";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  BeakerIcon,
  BellAlertIcon,
  BriefcaseIcon,
  ClockIcon,
  PlayIcon,
  SparklesIcon,
  StopIcon,
  SunIcon,
  MoonIcon,
} from "@heroicons/react/24/outline";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const AUTO_REFRESH_MS = 30000;
const BREAK_TYPES = [
  {
    key: "morning",
    label: "Morning Break",
    allowedMinutes: 15,
    icon: SunIcon,
    badge: "bg-amber-500/15 text-amber-300",
    progress: "bg-amber-500",
  },
  {
    key: "lunch",
    label: "Lunch Break",
    allowedMinutes: 30,
    icon: BeakerIcon,
    badge: "bg-orange-500/15 text-orange-300",
    progress: "bg-orange-500",
  },
  {
    key: "afternoon",
    label: "Afternoon Break",
    allowedMinutes: 15,
    icon: MoonIcon,
    badge: "bg-indigo-500/15 text-indigo-300",
    progress: "bg-indigo-500",
  },
];

const CARD_STYLES = {
  indigo: {
    badge: "bg-indigo-500/15 text-indigo-300",
    ring: "ring-indigo-500/15",
  },
  emerald: {
    badge: "bg-emerald-500/15 text-emerald-300",
    ring: "ring-emerald-500/15",
  },
  blue: {
    badge: "bg-blue-500/15 text-blue-300",
    ring: "ring-blue-500/15",
  },
  amber: {
    badge: "bg-amber-500/15 text-amber-300",
    ring: "ring-amber-500/15",
  },
  slate: {
    badge: "bg-slate-700/60 text-slate-300",
    ring: "ring-slate-700/40",
  },
};

function formatTime(value) {
  if (!value) return "-";

  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getShiftLabel(shiftType, gender) {
  if (shiftType === "women-day" || gender === "female") {
    return "9:00 AM - 6:00 PM";
  }

  return "10:00 AM - 7:00 PM";
}

function formatWeeklyOff(days = []) {
  if (!Array.isArray(days) || days.length === 0) {
    return "Sun";
  }

  return days
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    .map((day) => WEEKDAY_LABELS[day])
    .join(", ");
}

function secondsSince(dateValue, nowMs) {
  if (!dateValue) return 0;
  return Math.max(0, Math.floor((nowMs - new Date(dateValue).getTime()) / 1000));
}

function formatDurationFromSeconds(secondsValue) {
  const totalMinutes = Math.max(0, Math.floor(secondsValue / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${totalMinutes} mins`;
}

function formatTimer(secondsValue) {
  const totalSeconds = Math.max(0, Math.floor(secondsValue));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getStatusTone(status) {
  if (status === "present") return "emerald";
  if (status === "half-day") return "amber";
  return "slate";
}

export default function EmployeeDashboardAttendanceSection() {
  const todayDate = new Date().toISOString().slice(0, 10);

  const [todayAttendance, setTodayAttendance] = useState(null);
  const [todayBreaks, setTodayBreaks] = useState([]);
  const [userShift, setUserShift] = useState({
    shiftType: "",
    gender: "",
    weeklyOffDays: [0],
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [tick, setTick] = useState(Date.now());

  const loadDashboardAttendance = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    }

    setError("");

    try {
      const [attendanceResponse, breaksResponse, meResponse] = await Promise.all([
        apiFetch(`/api/attendance?date=${todayDate}`, { cache: "no-store" }),
        apiFetch(`/api/breaks?date=${todayDate}`, { cache: "no-store" }),
        apiFetch("/api/auth/me", { cache: "no-store" }),
      ]);

      const [attendanceData, breaksData, meData] = await Promise.all([
        attendanceResponse.json(),
        breaksResponse.json(),
        meResponse.json(),
      ]);

      if (!attendanceResponse.ok) {
        throw new Error(attendanceData.error || "Failed to load attendance");
      }

      if (!breaksResponse.ok) {
        throw new Error(breaksData.error || "Failed to load breaks");
      }

      setTodayAttendance(attendanceData.attendance?.[0] || null);
      setTodayBreaks(breaksData.breaks || []);

      if (meResponse.ok && meData?.user) {
        setUserShift({
          shiftType: meData.user.shiftType || "",
          gender: meData.user.gender || "",
          weeklyOffDays: meData.user.weeklyOffDays || [0],
        });
      }
    } catch (loadError) {
      setError(loadError.message || "Unable to load dashboard attendance");
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [todayDate]);

  useEffect(() => {
    void loadDashboardAttendance();
  }, [loadDashboardAttendance]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadDashboardAttendance({ silent: true });
      }
    }, AUTO_REFRESH_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void loadDashboardAttendance({ silent: true });
      }
    };

    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadDashboardAttendance]);

  useEffect(() => {
    const timer = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const completedBreakMinutes = useMemo(
    () =>
      todayBreaks
        .filter((item) => item.status === "completed")
        .reduce((sum, item) => sum + (item.durationMinutes || 0), 0),
    [todayBreaks],
  );

  const activeBreak = useMemo(
    () => todayBreaks.find((item) => item.status === "active") || null,
    [todayBreaks],
  );

  const shiftStarted = Boolean(todayAttendance?.shiftStart || todayAttendance?.checkIn);
  const shiftEnded = Boolean(todayAttendance?.shiftEnd || todayAttendance?.checkOut);

  const currentShiftSeconds = useMemo(() => {
    if (!shiftStarted || shiftEnded) return 0;

    const startTime = todayAttendance?.shiftStart || todayAttendance?.checkIn;
    return startTime ? secondsSince(startTime, tick) : 0;
  }, [shiftEnded, shiftStarted, tick, todayAttendance]);

  const breakUsageByType = useMemo(() => {
    return BREAK_TYPES.reduce((acc, breakType) => {
      const entries = todayBreaks.filter((item) => item.type === breakType.key);
      const completedSeconds = entries
        .filter((item) => item.status === "completed")
        .reduce((sum, item) => sum + (item.durationMinutes || 0) * 60, 0);
      const activeEntry = entries.find((item) => item.status === "active");
      const runningSeconds = activeEntry ? secondsSince(activeEntry.startTime, tick) : 0;
      const usedSeconds = completedSeconds + runningSeconds;
      const allowedSeconds = breakType.allowedMinutes * 60;

      acc[breakType.key] = {
        usedMinutes: Math.floor(usedSeconds / 60),
        progress: Math.min(100, Math.round((usedSeconds / allowedSeconds) * 1000) / 10),
        overLimit: usedSeconds > allowedSeconds,
        remainingSeconds: Math.max(0, allowedSeconds - usedSeconds),
        overrunSeconds: Math.max(0, usedSeconds - allowedSeconds),
        isActive: Boolean(activeEntry),
      };

      return acc;
    }, {});
  }, [tick, todayBreaks]);

  const runAction = async (name, endpoint, body = {}) => {
    setActionLoading(name);
    setError("");

    try {
      const response = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Action failed");
      }

      await loadDashboardAttendance({ silent: true });
    } catch (actionError) {
      setError(actionError.message || "Unable to complete attendance action");
    } finally {
      setActionLoading("");
    }
  };

  const canStartShift = !loading && !shiftStarted && !actionLoading;
  const canEndShift = !loading && shiftStarted && !shiftEnded && !activeBreak && !actionLoading;

  const handleStartShift = () => {
    if (!canStartShift) return;
    void runAction("shift-start", "/api/attendance/shift-start", {});
  };

  const handleEndShift = () => {
    if (!canEndShift) return;

    if (window.confirm("Are you sure you want to end your shift?")) {
      void runAction("shift-end", "/api/attendance/shift-end", {});
    }
  };

  const statusTone = getStatusTone(todayAttendance?.status);

  const stats = [
    {
      icon: BriefcaseIcon,
      label: "Shift Timing",
      value: getShiftLabel(userShift.shiftType, userShift.gender),
      subValue: `Weekly Off: ${formatWeeklyOff(userShift.weeklyOffDays)}`,
      tone: "indigo",
    },
    {
      icon: PlayIcon,
      label: "Shift Start",
      value: formatTime(todayAttendance?.shiftStart || todayAttendance?.checkIn),
      tone: "emerald",
      action: handleStartShift,
      disabled: !canStartShift,
      hint: shiftStarted ? "Shift started" : "Ready to start shift",
      buttonLabel: actionLoading === "shift-start" ? "Starting..." : "Start Shift",
      buttonTone: "from-emerald-500 to-green-500",
      showButton: !shiftStarted,
    },
    {
      icon: StopIcon,
      label: "Shift End",
      value: formatTime(todayAttendance?.shiftEnd || todayAttendance?.checkOut),
      tone: "blue",
      action: handleEndShift,
      disabled: !canEndShift,
      hint:
        shiftEnded
          ? "Shift already ended"
          : activeBreak
            ? "End active break first"
            : shiftStarted
              ? "Ready to end shift"
              : "Start shift first",
      buttonLabel: actionLoading === "shift-end" ? "Ending..." : "End Shift",
      buttonTone: "from-blue-500 to-indigo-500",
      showButton: shiftStarted && !shiftEnded,
    },
    {
      icon: ClockIcon,
      label: "Work Duration",
      value:
        shiftStarted && !shiftEnded
          ? formatDurationFromSeconds(currentShiftSeconds)
          : `${todayAttendance?.totalWorkMinutes || 0} mins`,
      subValue: `Break: ${completedBreakMinutes} mins`,
      tone: "amber",
    },
    {
      icon: BellAlertIcon,
      label: "Status",
      value: todayAttendance?.status || "not-started",
      subValue: activeBreak
        ? `${activeBreak.type} break active`
        : todayAttendance?.isLate
          ? `${todayAttendance?.lateMinutes || 0} mins late`
          : "On time",
      tone: statusTone,
    },
  ];

  return (
    <section className="rounded-[28px] border border-slate-800/80 bg-slate-950/75 p-4 shadow-lg backdrop-blur-sm md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">Today&apos;s Attendance</h2>
          <p className="text-sm text-slate-400">Start or end your shift directly from the dashboard.</p>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const style = CARD_STYLES[stat.tone];

          return (
            <article
              key={stat.label}
              className={`rounded-[24px] border border-slate-800 bg-slate-900/85 px-5 py-6 text-left shadow-sm ring-1 ${style.ring}`}
            >
              <div className={`inline-flex rounded-2xl p-3 ${style.badge}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {stat.label}
              </p>
              <p className="mt-2 text-[1.15rem] font-bold text-slate-100">
                {loading ? "..." : stat.value}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                {loading ? "Loading..." : stat.hint || stat.subValue || "\u00A0"}
              </p>
              {stat.action && stat.showButton ? (
                <button
                  type="button"
                  disabled={stat.disabled}
                  onClick={stat.action}
                  className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${stat.buttonTone} px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {actionLoading === "shift-start" && stat.label === "Shift Start" ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      {stat.buttonLabel}
                    </>
                  ) : actionLoading === "shift-end" && stat.label === "Shift End" ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      {stat.buttonLabel}
                    </>
                  ) : (
                    <>
                      <Icon className="h-4 w-4" />
                      {stat.buttonLabel}
                    </>
                  )}
                </button>
              ) : null}
            </article>
          );
        })}
      </div>

      <div className="mt-6 rounded-[24px] border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 p-3 shadow-lg">
            <SparklesIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Today&apos;s Actions</h3>
            <p className="text-sm text-slate-400">Manage your breaks</p>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-slate-300">Break Sessions</h4>
            <p className="text-xs text-slate-500">Only one active break at a time</p>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {BREAK_TYPES.map((breakType) => {
              const activeForType = todayBreaks.find(
                (item) => item.type === breakType.key && item.status === "active",
              );
              const completedForType = todayBreaks.find(
                (item) => item.type === breakType.key && item.status === "completed",
              );
              const usage = breakUsageByType[breakType.key] || {
                usedMinutes: 0,
                progress: 0,
                overLimit: false,
                remainingSeconds: breakType.allowedMinutes * 60,
                overrunSeconds: 0,
                isActive: false,
              };
              const Icon = breakType.icon;

              return (
                <article
                  key={breakType.key}
                  className="rounded-[22px] border border-slate-800 bg-slate-950/80 p-4 shadow-sm ring-1 ring-slate-800/70"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={`inline-flex rounded-2xl p-3 ${breakType.badge}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    {usage.isActive ? (
                      <span className="rounded-full bg-blue-500/15 px-2.5 py-1 text-xs font-semibold text-blue-300">
                        Active
                      </span>
                    ) : null}
                  </div>

                  <h5 className="mt-4 text-xl font-semibold text-slate-100">{breakType.label}</h5>
                  <p className="mt-1 text-sm text-slate-400">
                    {activeForType
                      ? `Started at ${formatTime(activeForType.startTime)}`
                      : completedForType
                        ? `Completed (${completedForType.durationMinutes} mins)`
                        : "Ready to start"}
                  </p>

                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-400">Progress</span>
                      <span className={usage.overLimit ? "font-bold text-rose-400" : "font-bold text-slate-200"}>
                        {usage.usedMinutes}/{breakType.allowedMinutes} min
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full ${usage.overLimit ? "bg-rose-500" : breakType.progress}`}
                        style={{ width: `${usage.progress}%` }}
                      />
                    </div>
                  </div>

                  {usage.isActive ? (
                    <p className={`mt-4 text-center text-sm font-mono font-semibold ${usage.overLimit ? "text-rose-400" : "text-slate-200"}`}>
                      {usage.overLimit
                        ? `Over by ${formatTimer(usage.overrunSeconds)}`
                        : `${formatTimer(usage.remainingSeconds)} remaining`}
                    </p>
                  ) : null}

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      disabled={
                        loading ||
                        !shiftStarted ||
                        shiftEnded ||
                        Boolean(activeBreak) ||
                        Boolean(completedForType) ||
                        Boolean(actionLoading)
                      }
                      onClick={() =>
                        void runAction(`start-${breakType.key}`, "/api/breaks/start", { type: breakType.key })
                      }
                      className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {actionLoading === `start-${breakType.key}` ? (
                        <ArrowPathIcon className="mx-auto h-4 w-4 animate-spin" />
                      ) : (
                        "Start"
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={loading || !activeForType || Boolean(actionLoading)}
                      onClick={() =>
                        void runAction(`end-${breakType.key}`, "/api/breaks/end", { type: breakType.key })
                      }
                      className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {actionLoading === `end-${breakType.key}` ? (
                        <ArrowPathIcon className="mx-auto h-4 w-4 animate-spin" />
                      ) : (
                        "End"
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
