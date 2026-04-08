"use client";
import { apiFetch } from "@/lib/client-api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClockIcon,
  CalendarIcon,
  BriefcaseIcon,
  XCircleIcon,
  PlayIcon,
  StopIcon,
  BeakerIcon,
  SparklesIcon,
  ArrowPathIcon,
  BellAlertIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";

const BREAK_TYPES = [
  { key: "break", label: "Break", allowedMinutes: 30, icon: BeakerIcon, color: "cyan" },
];

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const AUTO_REFRESH_MS = 30000;

function formatTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function getShiftLabel(shiftType, gender) {
  if (shiftType === "women-day" || gender === "female") {
    return "9:00 AM - 6:00 PM";
  }
  return "10:00 AM - 7:00 PM";
}

function formatWeeklyOff(days = []) {
  if (!Array.isArray(days) || days.length === 0) return "Sun";
  return days
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    .map((day) => WEEKDAY_LABELS[day])
    .join(", ");
}

function secondsSince(dateValue, nowMs) {
  if (!dateValue) return 0;
  return Math.max(0, Math.floor((nowMs - new Date(dateValue).getTime()) / 1000));
}

function formatDuration(secondsValue) {
  const totalSeconds = Math.max(0, Math.floor(secondsValue));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 12,
    },
  },
};

const cardVariants = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 20,
    },
  },
  hover: {
    scale: 1.02,
    y: -2,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25,
    },
  },
  tap: { scale: 0.98 },
};

const buttonVariants = {
  hover: { scale: 1.05 },
  tap: { scale: 0.95 },
  disabled: { opacity: 0.5, scale: 1 },
};

const floatingAnimation = {
  initial: { y: 0 },
  animate: {
    y: [-10, 10, -10],
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

export default function EmployeeAttendancePanel({ hideControls = false }) {
  const todayDate = new Date().toISOString().slice(0, 10);

  const [todayAttendance, setTodayAttendance] = useState(null);
  const [todayBreaks, setTodayBreaks] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [tick, setTick] = useState(Date.now());
  const [isLoaded, setIsLoaded] = useState(false);
  const [drivingMode, setDrivingMode] = useState(false);
  const [drivingModeLoading, setDrivingModeLoading] = useState(false);
  const [userShift, setUserShift] = useState({
    shiftType: "",
    gender: "",
    weeklyOffDays: [0],
  });

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError("");

    try {
      const [todayAttendanceResponse, todayBreaksResponse, historyResponse, meResponse] = await Promise.all([
        apiFetch(`/api/attendance?date=${todayDate}`, { cache: "no-store" }),
        apiFetch(`/api/breaks?date=${todayDate}`, { cache: "no-store" }),
        apiFetch("/api/attendance", { cache: "no-store" }),
        apiFetch("/api/auth/me", { cache: "no-store" }),
      ]);

      const [todayAttendanceData, todayBreaksData, historyData, meData] = await Promise.all([
        todayAttendanceResponse.json(),
        todayBreaksResponse.json(),
        historyResponse.json(),
        meResponse.json(),
      ]);

      if (!todayAttendanceResponse.ok) throw new Error(todayAttendanceData.error || "Failed to load attendance");
      if (!todayBreaksResponse.ok) throw new Error(todayBreaksData.error || "Failed to load breaks");
      if (!historyResponse.ok) throw new Error(historyData.error || "Failed to load history");

      setTodayAttendance(todayAttendanceData.attendance?.[0] || null);
      setTodayBreaks(todayBreaksData.breaks || []);
      setHistory(historyData.attendance || []);
      if (meResponse.ok && meData?.user) {
        setUserShift({
          shiftType: meData.user.shiftType || "",
          gender: meData.user.gender || "",
          weeklyOffDays: meData.user.weeklyOffDays || [0],
        });
        setDrivingMode(Boolean(meData.user.drivingMode));
      }
    } catch (loadError) {
      setError(loadError.message || "Unable to load attendance data");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [todayDate]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadData({ silent: true });
      }
    }, AUTO_REFRESH_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void loadData({ silent: true });
      }
    };

    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadData]);

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

  const activeBreak = todayBreaks.find((item) => item.status === "active") || null;

  const breakUsageByType = useMemo(() => {
    return BREAK_TYPES.reduce((acc, breakType) => {
      const entries = todayBreaks.filter((item) => item.type === breakType.key);
      const completedSeconds = entries
        .filter((item) => item.status === "completed")
        .reduce((sum, item) => sum + (item.durationMinutes || 0) * 60, 0);
      const active = entries.find((item) => item.status === "active");
      const runningSeconds = active ? secondsSince(active.startTime, tick) : 0;
      const usedSeconds = completedSeconds + runningSeconds;
      const allowedSeconds = breakType.allowedMinutes * 60;
      const remainingSeconds = Math.max(0, allowedSeconds - usedSeconds);
      const overrunSeconds = Math.max(0, usedSeconds - allowedSeconds);

      acc[breakType.key] = {
        usedSeconds,
        usedMinutes: Math.floor(usedSeconds / 60),
        progress: Math.min(100, Math.round((usedSeconds / allowedSeconds) * 1000) / 10),
        overLimit: overrunSeconds > 0,
        remainingSeconds,
        overrunSeconds,
        isActive: !!active,
      };
      return acc;
    }, {});
  }, [todayBreaks, tick]);

  const runAction = async (name, endpoint, body = null) => {
    setActionLoading(name);
    setError("");

    try {
      const response = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : null,
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Action failed");

      await loadData({ silent: true });
    } catch (actionError) {
      setError(actionError.message || "Unable to complete action");
    } finally {
      setActionLoading("");
    }
  };

  const toggleDrivingMode = async () => {
    setDrivingModeLoading(true);
    setError("");
    try {
      const response = await apiFetch("/api/auth/me/driving-mode", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drivingMode: !drivingMode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to toggle driving mode");
      setDrivingMode(Boolean(data.drivingMode));
    } catch (actionError) {
      setError(actionError.message || "Unable to toggle driving mode");
    } finally {
      setDrivingModeLoading(false);
    }
  };

  const startShift = async () => {
    setActionLoading("shift-start");
    setError("");
    try {
      await runAction("shift-start", "/api/attendance/shift-start", {});
    } catch (locationError) {
      setActionLoading("");
      setError(locationError.message || "Unable to start shift");
    }
  };

  const handleShiftEndClick = () => {
    const isConfirmed = window.confirm("Are you sure you want to end your shift?");
    if (!isConfirmed) return;
    void runAction("shift-end", "/api/attendance/shift-end");
  };

  const shiftStarted = Boolean(todayAttendance?.shiftStart || todayAttendance?.checkIn);
  const shiftEnded = Boolean(todayAttendance?.shiftEnd || todayAttendance?.checkOut);

  // Calculate current shift duration
  const currentShiftSeconds = useMemo(() => {
    if (!shiftStarted || shiftEnded) return 0;
    const startTime = todayAttendance?.shiftStart || todayAttendance?.checkIn;
    return startTime ? secondsSince(startTime, tick) : 0;
  }, [shiftStarted, shiftEnded, todayAttendance, tick]);

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-slate-50 via-[#A346FF]/30 to-[#A346FF]/30 p-3 sm:p-4 md:p-6"
      initial="hidden"
      animate={isLoaded ? "visible" : "hidden"}
      variants={containerVariants}
    >
      {/* Animated Background Elements */}
      <motion.div
        variants={floatingAnimation}
        animate="animate"
        className="fixed left-0 top-20 h-64 w-64 rounded-full bg-[#A346FF]/5 blur-3xl"
      />
      <motion.div
        variants={floatingAnimation}
        animate="animate"
        className="fixed bottom-20 right-0 h-80 w-80 rounded-full bg-[#A346FF]/5 blur-3xl"
      />

      <div className="relative space-y-4 sm:space-y-6">
        {!hideControls ? (
          <>
            {/* Header Section with Glass Effect */}
            <motion.section 
              variants={itemVariants}
              className="relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-xl border border-white/20 shadow-xl p-4 sm:p-6"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#A346FF]/5 to-[#A346FF]/10" />
              <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#A346FF] to-[#A346FF] bg-clip-text text-transparent">
                    Attendance & Breaks
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Start/end your shift and monitor break limits in real-time
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-sm border border-slate-200"
                  >
                    <CalendarIcon className="h-4 w-4 text-[#A346FF]" />
                    <span className="text-xs sm:text-sm font-medium text-slate-700">{formatDate(new Date())}</span>
                  </motion.div>
                  {shiftStarted && !shiftEnded && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5"
                    >
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-xs font-medium text-emerald-700">Active Shift</span>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.section>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="relative overflow-hidden rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 p-4 shadow-lg"
                >
                  <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
                  <p className="relative text-sm font-medium text-white flex items-center gap-2">
                    <XCircleIcon className="h-5 w-5" />
                    {error}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Stats Cards - Modern Grid */}
            <motion.section 
              variants={itemVariants}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
            >
          {[
            { 
              icon: BriefcaseIcon, 
              label: "Shift Timing", 
              value: getShiftLabel(userShift.shiftType, userShift.gender),
              subValue: `Weekly Off: ${formatWeeklyOff(userShift.weeklyOffDays)}`,
              color: "indigo",
              gradient: "from-[#A346FF] to-[#A346FF]"
            },
            { 
              icon: PlayIcon, 
              label: "Shift Start", 
              value: formatTime(todayAttendance?.shiftStart || todayAttendance?.checkIn),
              color: "emerald",
              gradient: "from-emerald-500 to-green-500"
            },
            { 
              icon: StopIcon, 
              label: "Shift End", 
              value: formatTime(todayAttendance?.shiftEnd || todayAttendance?.checkOut),
              color: "blue",
              gradient: "from-[#A346FF] to-[#A346FF]"
            },
            { 
              icon: ClockIcon, 
              label: "Work Duration", 
              value: shiftStarted && !shiftEnded ? formatDuration(currentShiftSeconds) : `${todayAttendance?.totalWorkMinutes || 0} mins`,
              subValue: `Break: ${completedBreakMinutes} mins`,
              color: "amber",
              gradient: "from-amber-500 to-orange-500"
            },
            { 
              icon: BellAlertIcon, 
              label: "Status", 
              value: todayAttendance?.status || "not-started",
              subValue: todayAttendance?.isLate ? `${todayAttendance?.lateMinutes || 0} mins late` : "On time",
              color: todayAttendance?.status === "present" ? "emerald" : todayAttendance?.status === "half-day" ? "amber" : "slate",
              gradient: todayAttendance?.status === "present" ? "from-emerald-500 to-green-500" : "from-slate-500 to-gray-500"
            },
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              variants={cardVariants}
              whileHover="hover"
              whileTap="tap"
              className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
              <div className="relative">
                <div className={`inline-flex rounded-xl bg-${stat.color}-50 p-2.5`}>
                  <stat.icon className={`h-5 w-5 text-${stat.color}-600`} />
                </div>
                <p className="mt-3 text-xs font-medium text-slate-400 uppercase tracking-wider">{stat.label}</p>
                <p className="mt-1 text-base sm:text-lg font-bold text-slate-800 break-words">
                  {stat.value}
                </p>
                {stat.subValue && (
                  <p className="mt-1 text-xs text-slate-500">{stat.subValue}</p>
                )}
              </div>
              {/* Decorative Elements */}
              <div className="absolute -bottom-2 -right-2 h-16 w-16 rounded-full bg-gradient-to-br from-slate-100 to-white opacity-50 blur-2xl" />
            </motion.div>
          ))}
            </motion.section>

            {/* Today Actions Section - Modern Card */}
            <motion.section 
              variants={itemVariants}
              className="relative overflow-hidden rounded-2xl bg-white shadow-xl"
            >
          <div className="absolute inset-0 bg-gradient-to-br from-[#A346FF]/50 to-[#A346FF]/100" />
          
          <div className="relative p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-xl bg-gradient-to-r from-[#A346FF] to-[#A346FF] p-2.5 shadow-lg">
                <SparklesIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-800">Today&apos;s Actions</h2>
                <p className="text-xs sm:text-sm text-slate-500">Manage your shift and breaks</p>
              </div>
            </div>

            {/* Shift Control Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <motion.button
                type="button"
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                disabled={loading || shiftStarted || !!actionLoading}
                onClick={() => void startShift()}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 px-6 py-3 text-sm font-medium text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                <span className="relative flex items-center justify-center gap-2">
                  {actionLoading === "shift-start" ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <PlayIcon className="h-4 w-4" />
                      Start Shift
                    </>
                  )}
                </span>
              </motion.button>

              <motion.button
                type="button"
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                disabled={loading || !shiftStarted || shiftEnded || !!activeBreak || !!actionLoading}
                onClick={handleShiftEndClick}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-[#A346FF] to-[#A346FF] px-6 py-3 text-sm font-medium text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                <span className="relative flex items-center justify-center gap-2">
                  {actionLoading === "shift-end" ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      Ending...
                    </>
                  ) : (
                    <>
                      <StopIcon className="h-4 w-4" />
                      End Shift
                    </>
                  )}
                </span>
              </motion.button>

              <motion.button
                type="button"
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                onClick={() => void toggleDrivingMode()}
                disabled={drivingModeLoading}
                className={`rounded-xl border px-6 py-3 text-sm font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                  drivingMode
                    ? "border-[#A346FF]/50 bg-[#A346FF]/15 text-[#A346FF]"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="relative flex items-center justify-center gap-2">
                  <TruckIcon className="h-4 w-4" />
                  {drivingModeLoading ? "Updating..." : drivingMode ? "Driving Mode: On" : "Driving Mode: Off"}
                </span>
              </motion.button>
            </div>

            {/* Break Controls */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-700">Break Sessions</h3>
                <p className="text-xs text-slate-400">Only one active break at a time</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {BREAK_TYPES.map((breakType) => {
                  const activeForType = todayBreaks.find(
                    (item) => item.type === breakType.key && item.status === "active",
                  );
                  const completedEntries = todayBreaks.filter(
                    (item) => item.type === breakType.key && item.status === "completed",
                  );
                  const usage = breakUsageByType[breakType.key] || {
                    usedMinutes: 0,
                    usedSeconds: 0,
                    progress: 0,
                    overLimit: false,
                    remainingSeconds: breakType.allowedMinutes * 60,
                    overrunSeconds: 0,
                    isActive: false,
                  };
                  const Icon = breakType.icon;

                  return (
                    <motion.div
                      key={breakType.key}
                      variants={cardVariants}
                      whileHover="hover"
                      className="group relative overflow-hidden rounded-xl bg-white border border-slate-100 p-4 shadow-md hover:shadow-lg transition-all duration-300"
                    >
                      {/* Background Gradient */}
                      <div className={`absolute inset-0 bg-gradient-to-br from-${breakType.color}-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                      
                      <div className="relative">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className={`rounded-lg bg-${breakType.color}-100 p-2`}>
                            <Icon className={`h-5 w-5 text-${breakType.color}-600`} />
                          </div>
                          {usage.isActive && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="flex items-center gap-1 rounded-full bg-[#A346FF]/15 px-2 py-0.5"
                            >
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A346FF] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#A346FF]"></span>
                              </span>
                              <span className="text-[10px] font-medium text-[#A346FF]">Active</span>
                            </motion.div>
                          )}
                        </div>

                        {/* Title */}
                        <h4 className="text-base font-bold text-slate-800 mb-1">{breakType.label}</h4>
                        
                        {/* Status */}
                        <p className="text-xs text-slate-500 mb-3">
                          {activeForType
                            ? `Started at ${formatTime(activeForType.startTime)}`
                            : completedEntries.length > 0
                              ? `${completedEntries.length} sessions completed`
                              : "Ready to start"}
                        </p>

                        {/* Progress Bar */}
                        <div className="mb-2">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-medium text-slate-600">Progress</span>
                            <span className={`font-bold ${usage.overLimit ? 'text-red-600' : `text-${breakType.color}-600`}`}>
                              {usage.usedMinutes}/{breakType.allowedMinutes} min
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${usage.progress}%` }}
                              transition={{ duration: 0.5 }}
                              className={`h-full rounded-full ${
                                usage.overLimit 
                                  ? 'bg-gradient-to-r from-red-500 to-rose-500' 
                                  : `bg-gradient-to-r from-${breakType.color}-500 to-${breakType.color}-400`
                              }`}
                            />
                          </div>
                        </div>

                        {/* Timer Display */}
                        {usage.isActive && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mb-3 text-center"
                          >
                            <p className={`text-sm font-mono font-bold ${usage.overLimit ? 'text-red-600' : `text-${breakType.color}-600`}`}>
                              {usage.overLimit
                                ? `Over by ${formatDuration(usage.overrunSeconds)}`
                                : `${formatDuration(usage.remainingSeconds)} remaining`}
                            </p>
                          </motion.div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-3">
                          <motion.button
                            type="button"
                            variants={buttonVariants}
                            whileHover="hover"
                            whileTap="tap"
                            disabled={
                              loading ||
                              !shiftStarted ||
                              shiftEnded ||
                              !!activeBreak ||
                              !!actionLoading
                            }
                            onClick={() =>
                              runAction(`start-${breakType.key}`, "/api/breaks/start", {
                                type: breakType.key,
                              })
                            }
                            className={`flex-1 rounded-lg border border-${breakType.color}-200 bg-${breakType.color}-50 px-3 py-2 text-xs font-medium text-${breakType.color}-700 hover:bg-${breakType.color}-100 disabled:opacity-40 transition-all duration-200`}
                          >
                            {actionLoading === `start-${breakType.key}` ? (
                              <ArrowPathIcon className="h-3 w-3 animate-spin mx-auto" />
                            ) : (
                              "Start"
                            )}
                          </motion.button>
                          
                          <motion.button
                            type="button"
                            variants={buttonVariants}
                            whileHover="hover"
                            whileTap="tap"
                            disabled={loading || !activeForType || !!actionLoading}
                            onClick={() =>
                              runAction(`end-${breakType.key}`, "/api/breaks/end", {
                                type: breakType.key,
                              })
                            }
                            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all duration-200"
                          >
                            {actionLoading === `end-${breakType.key}` ? (
                              <ArrowPathIcon className="h-3 w-3 animate-spin mx-auto" />
                            ) : (
                              "End"
                            )}
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
            </motion.section>
          </>
        ) : null}

        {/* Attendance History Section */}
        <motion.section 
          variants={itemVariants}
          className="relative overflow-hidden rounded-2xl bg-white shadow-xl"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white" />
          
          <div className="relative p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-xl bg-gradient-to-r from-[#A346FF] to-pink-500 p-2.5 shadow-lg">
                <CalendarIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-800">Attendance History</h2>
                <p className="text-xs sm:text-sm text-slate-500">Your recent attendance records</p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full border-4 border-slate-200 border-t-[#A346FF] animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <SparklesIcon className="h-5 w-5 text-[#A346FF] animate-pulse" />
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Mobile View - Cards */}
                <div className="space-y-3 lg:hidden">
                  <AnimatePresence mode="popLayout">
                    {history.slice(0, 10).map((row, index) => (
                      <motion.div
                        key={row._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.02 }}
                        className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-white to-slate-50 border border-slate-100 p-4 shadow-md hover:shadow-lg transition-all duration-300"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-[#A346FF]/5 to-[#A346FF]/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="relative">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-bold text-slate-800">{formatDate(row.date)}</p>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              row.status === "present" ? "bg-emerald-100 text-emerald-700" :
                              row.status === "half-day" ? "bg-amber-100 text-amber-700" :
                              "bg-slate-100 text-slate-700"
                            }`}>
                              {row.status}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <div className="bg-white/80 rounded-lg p-2">
                              <p className="text-[10px] text-slate-400">Start</p>
                              <p className="text-xs font-medium text-slate-700">{formatTime(row.shiftStart || row.checkIn)}</p>
                            </div>
                            <div className="bg-white/80 rounded-lg p-2">
                              <p className="text-[10px] text-slate-400">End</p>
                              <p className="text-xs font-medium text-slate-700">{formatTime(row.shiftEnd || row.checkOut)}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Work: {row.totalWorkMinutes || 0} mins</span>
                            {row.isLate && (
                              <span className="text-amber-600 font-medium">
                                {row.lateMinutes || 0} mins late
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto rounded-xl border border-slate-100">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Shift Start</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Shift End</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Work Duration</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Late</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <AnimatePresence>
                        {history.slice(0, 20).map((row, index) => (
                          <motion.tr
                            key={row._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ delay: index * 0.03 }}
                            whileHover={{ backgroundColor: "rgba(241, 245, 249, 0.5)" }}
                            className="group transition-colors duration-200"
                          >
                            <td className="px-6 py-4 text-sm font-medium text-slate-700">{formatDate(row.date)}</td>
                            <td className="px-6 py-4 text-sm text-slate-600">{formatTime(row.shiftStart || row.checkIn)}</td>
                            <td className="px-6 py-4 text-sm text-slate-600">{formatTime(row.shiftEnd || row.checkOut)}</td>
                            <td className="px-6 py-4 text-sm font-medium text-[#A346FF]">{row.totalWorkMinutes || 0} mins</td>
                            <td className="px-6 py-4">
                              {row.isLate ? (
                                <span className="inline-flex items-center gap-1 text-amber-600">
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                  {row.lateMinutes || 0} mins
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                row.status === "present" ? "bg-emerald-100 text-emerald-700" :
                                row.status === "half-day" ? "bg-amber-100 text-amber-700" :
                                "bg-slate-100 text-slate-700"
                              }`}>
                                {row.status}
                              </span>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>

                {/* Empty State */}
                {history.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-12"
                  >
                    <div className="rounded-full bg-slate-100 p-4 mb-3">
                      <CalendarIcon className="h-8 w-8 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">No attendance history found</p>
                    <p className="text-xs text-slate-400 mt-1">Your attendance records will appear here</p>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </motion.section>

      </div>
    </motion.div>
  );
}

