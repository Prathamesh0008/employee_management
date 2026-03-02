"use client";
import { apiFetch } from "@/lib/client-api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarIcon,
  ChartBarIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ClockIcon,
  SunIcon,
  MoonIcon,
  BriefcaseIcon,
  SparklesIcon,
  ArrowPathIcon,
  FunnelIcon,
  ExclamationCircleIcon,
  BeakerIcon,
} from "@heroicons/react/24/outline";

const AUTO_REFRESH_MS = 5000;

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

function formatMinutes(minutes) {
  if (!minutes) return "0 min";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

const STATUS_STYLES = {
  present: "bg-emerald-100 text-emerald-700 border-emerald-200",
  "half-day": "bg-amber-100 text-amber-700 border-amber-200",
  absent: "bg-rose-100 text-rose-700 border-rose-200",
};

const BREAK_STATUS_STYLES = {
  active: "bg-blue-100 text-blue-700 border-blue-200 animate-pulse",
  completed: "bg-slate-100 text-slate-700 border-slate-200",
};

const BREAK_TYPE_STYLES = {
  morning: "bg-amber-100 text-amber-700 border-amber-200",
  lunch: "bg-orange-100 text-orange-700 border-orange-200",
  afternoon: "bg-indigo-100 text-indigo-700 border-indigo-200",
};

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

export default function AttendanceOverviewPanel({ title }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendance, setAttendance] = useState([]);
  const [breaks, setBreaks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [attendanceFilter, setAttendanceFilter] = useState("all");
  const [breakFilter, setBreakFilter] = useState("all");

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    }
    setError("");
    setSuccess("");

    try {
      const [attendanceResponse, breaksResponse] = await Promise.all([
        apiFetch(`/api/attendance?date=${selectedDate}`, { cache: "no-store" }),
        apiFetch(`/api/breaks?date=${selectedDate}`, { cache: "no-store" }),
      ]);

      const [attendanceData, breaksData] = await Promise.all([
        attendanceResponse.json(),
        breaksResponse.json(),
      ]);

      if (!attendanceResponse.ok) {
        throw new Error(attendanceData.error || "Failed to load attendance");
      }

      if (!breaksResponse.ok) {
        throw new Error(breaksData.error || "Failed to load breaks");
      }

      setAttendance(attendanceData.attendance || []);
      setBreaks(breaksData.breaks || []);
      
      if (!silent) {
        setSuccess("Data refreshed successfully!");
        setTimeout(() => setSuccess(""), 2000);
      }
    } catch (loadError) {
      setError(loadError.message || "Unable to load data");
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [selectedDate]);

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

  // Filter attendance data
  const filteredAttendance = useMemo(() => {
    if (attendanceFilter === "all") return attendance;
    return attendance.filter(row => row.status === attendanceFilter);
  }, [attendance, attendanceFilter]);

  // Filter breaks data
  const filteredBreaks = useMemo(() => {
    if (breakFilter === "all") return breaks;
    return breaks.filter(row => row.status === breakFilter);
  }, [breaks, breakFilter]);

  const summary = useMemo(() => {
    const present = attendance.filter((row) => row.status === "present").length;
    const halfDay = attendance.filter((row) => row.status === "half-day").length;
    const absent = attendance.filter((row) => row.status === "absent").length;
    const activeBreaks = breaks.filter((row) => row.status === "active").length;
    
    const totalWorkMinutes = attendance.reduce((acc, row) => acc + (row.totalWorkMinutes || 0), 0);
    const totalLateMinutes = attendance.reduce((acc, row) => acc + (row.lateMinutes || 0), 0);
    const totalOvertimeMinutes = attendance.reduce((acc, row) => acc + (row.overtimeMinutes || 0), 0);
    
    const breakTypes = breaks.reduce((acc, row) => {
      acc[row.type] = (acc[row.type] || 0) + 1;
      return acc;
    }, {});

    return {
      totalAttendance: attendance.length,
      present,
      halfDay,
      absent,
      totalBreaks: breaks.length,
      activeBreaks,
      totalWorkMinutes,
      totalLateMinutes,
      totalOvertimeMinutes,
      breakTypes,
    };
  }, [attendance, breaks]);

  const attendanceRate = useMemo(() => {
    const total = summary.present + summary.halfDay;
    const possible = summary.totalAttendance;
    return possible > 0 ? Math.round((total / possible) * 100) : 0;
  }, [summary]);

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 p-3 sm:p-4 md:p-6"
      initial="hidden"
      animate={isLoaded ? "visible" : "hidden"}
      variants={containerVariants}
    >
      {/* Animated Background Elements */}
      <motion.div
        variants={floatingAnimation}
        animate="animate"
        className="fixed left-0 top-20 h-64 w-64 rounded-full bg-blue-500/5 blur-3xl"
      />
      <motion.div
        variants={floatingAnimation}
        animate="animate"
        className="fixed bottom-20 right-0 h-80 w-80 rounded-full bg-indigo-500/5 blur-3xl"
      />

      <div className="relative space-y-4 sm:space-y-6">
        {/* Header Section with Glass Effect */}
        <motion.section 
          variants={itemVariants}
          className="relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-xl border border-white/20 shadow-xl p-4 sm:p-6"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-indigo-600/5" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {title}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                View company attendance and break records by date
              </p>
            </div>
            <div className="flex items-center gap-2">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-sm border border-slate-200"
              >
                <CalendarIcon className="h-4 w-4 text-blue-500" />
                <span className="text-xs sm:text-sm font-medium text-slate-700">
                  {formatDate(new Date(selectedDate))}
                </span>
              </motion.div>
              {summary.activeBreaks > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  <span className="text-xs font-medium text-amber-700">{summary.activeBreaks} Active Breaks</span>
                </motion.div>
              )}
            </div>
          </div>
        </motion.section>

        {/* Success/Error Messages */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 p-4 shadow-lg"
            >
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
              <p className="relative text-sm font-medium text-white flex items-center gap-2">
                <CheckCircleIcon className="h-5 w-5" />
                {success}
              </p>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="relative overflow-hidden rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 p-4 shadow-lg"
            >
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
              <p className="relative text-sm font-medium text-white flex items-center gap-2">
                <ExclamationCircleIcon className="h-5 w-5" />
                {error}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Date Selector and Controls */}
        <motion.section 
          variants={itemVariants}
          className="relative overflow-hidden rounded-2xl bg-white shadow-xl"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white" />
          
          <div className="relative p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(event) => setSelectedDate(event.target.value)}
                    className="rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                  />
                  <CalendarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
                
                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  type="button"
                  onClick={() => void loadData()}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </motion.button>
              </div>

              {/* Quick Stats */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1">
                  <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-medium text-emerald-700">{summary.present} Present</span>
                </div>
                <div className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1">
                  <SunIcon className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-medium text-amber-700">{summary.halfDay} Half Day</span>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Stats Cards */}
        <motion.section 
          variants={itemVariants}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
        >
          {[
            { 
              icon: UserGroupIcon, 
              label: "Total Attendance", 
              value: summary.totalAttendance,
              subValue: `${attendanceRate}% rate`,
              color: "indigo",
              gradient: "from-indigo-500 to-purple-500"
            },
            { 
              icon: CheckCircleIcon, 
              label: "Present", 
              value: summary.present,
              color: "emerald",
              gradient: "from-emerald-500 to-green-500"
            },
            { 
              icon: SunIcon, 
              label: "Half Day", 
              value: summary.halfDay,
              color: "amber",
              gradient: "from-amber-500 to-orange-500"
            },
            { 
              icon: BriefcaseIcon, 
              label: "Work Time", 
              value: formatMinutes(summary.totalWorkMinutes),
              subValue: `${summary.totalLateMinutes} mins late`,
              color: "blue",
              gradient: "from-blue-500 to-indigo-500"
            },
            { 
              icon: BeakerIcon, 
              label: "Break Sessions", 
              value: summary.totalBreaks,
              subValue: `${summary.activeBreaks} active`,
              color: "purple",
              gradient: "from-purple-500 to-pink-500"
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
                <p className={`mt-1 text-xl sm:text-2xl font-bold text-${stat.color}-600`}>{stat.value}</p>
                {stat.subValue && (
                  <p className="mt-1 text-xs text-slate-400">{stat.subValue}</p>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 h-16 w-16 rounded-full bg-gradient-to-br from-slate-100 to-white opacity-50 blur-2xl" />
            </motion.div>
          ))}
        </motion.section>

        {/* Attendance List Section */}
        <motion.section 
          variants={itemVariants}
          className="relative overflow-hidden rounded-2xl bg-white shadow-xl"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-teal-50/50" />
          
          <div className="relative p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 p-2.5 shadow-lg">
                  <UserGroupIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-800">Attendance List</h2>
                  <p className="text-xs sm:text-sm text-slate-500">Employee attendance records for {formatDate(new Date(selectedDate))}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <FunnelIcon className="h-4 w-4" />
                  Filter
                </motion.button>
              </div>
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mb-4"
                >
                  <select
                    value={attendanceFilter}
                    onChange={(e) => setAttendanceFilter(e.target.value)}
                    className="w-full sm:w-auto rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  >
                    <option value="all">All Status</option>
                    <option value="present">Present</option>
                    <option value="half-day">Half Day</option>
                    <option value="absent">Absent</option>
                  </select>
                </motion.div>
              )}
            </AnimatePresence>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full border-4 border-slate-200 border-t-emerald-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <SparklesIcon className="h-5 w-5 text-emerald-500 animate-pulse" />
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Mobile View - Cards */}
                <div className="space-y-3 lg:hidden">
                  <AnimatePresence mode="popLayout">
                    {filteredAttendance.map((row, index) => (
                      <motion.div
                        key={row._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.02 }}
                        className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-white to-slate-50 border border-slate-100 p-4 shadow-md hover:shadow-lg transition-all duration-300"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="relative">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center text-white text-xs font-medium">
                                {row.user?.name?.charAt(0) || "U"}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-800">{row.user?.name || "Unknown"}</p>
                                <p className="text-xs text-slate-400">{row.user?.email}</p>
                              </div>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[row.status] || STATUS_STYLES.present}`}>
                              {row.status}
                            </span>
                          </div>
                          
                          <div className="ml-10">
                            <p className="text-xs text-slate-500 mb-2">{formatDate(row.date)}</p>
                            
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
                            
                            <div className="grid grid-cols-3 gap-1 text-xs">
                              <div className="text-center">
                                <span className="text-slate-400">Work</span>
                                <p className="font-medium text-emerald-600">{formatMinutes(row.totalWorkMinutes)}</p>
                              </div>
                              <div className="text-center">
                                <span className="text-slate-400">Late</span>
                                <p className="font-medium text-amber-600">{row.isLate ? `${row.lateMinutes}m` : "No"}</p>
                              </div>
                              <div className="text-center">
                                <span className="text-slate-400">OT</span>
                                <p className="font-medium text-blue-600">{row.overtimeMinutes || 0}m</p>
                              </div>
                            </div>
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
                      <tr className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-slate-200">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Shift Start</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Shift End</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Work Time</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Late</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Overtime</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <AnimatePresence>
                        {filteredAttendance.map((row, index) => (
                          <motion.tr
                            key={row._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ delay: index * 0.03 }}
                            whileHover={{ backgroundColor: "rgba(241, 245, 249, 0.5)" }}
                            className="group transition-colors duration-200"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center text-white text-xs font-medium">
                                  {row.user?.name?.charAt(0) || "U"}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-slate-800">{row.user?.name || "Unknown"}</p>
                                  <p className="text-xs text-slate-400">{row.user?.email || "-"}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">{formatDate(row.date)}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{formatTime(row.shiftStart || row.checkIn)}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{formatTime(row.shiftEnd || row.checkOut)}</td>
                            <td className="px-4 py-3">
                              <span className="text-sm font-medium text-emerald-600">
                                {formatMinutes(row.totalWorkMinutes)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {row.isLate ? (
                                <span className="text-sm font-medium text-amber-600">{row.lateMinutes || 0} mins</span>
                              ) : (
                                <span className="text-sm text-slate-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {row.overtimeMinutes ? (
                                <span className="text-sm font-medium text-blue-600">{row.overtimeMinutes} mins</span>
                              ) : (
                                <span className="text-sm text-slate-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[row.status] || STATUS_STYLES.present}`}>
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
                {filteredAttendance.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-12"
                  >
                    <div className="rounded-full bg-slate-100 p-4 mb-3">
                      <UserGroupIcon className="h-8 w-8 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">No attendance records found</p>
                    <p className="text-xs text-slate-400 mt-1">Try selecting a different date</p>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </motion.section>

        {/* Break Sessions Section */}
        <motion.section 
          variants={itemVariants}
          className="relative overflow-hidden rounded-2xl bg-white shadow-xl"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-pink-50/50" />
          
          <div className="relative p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 p-2.5 shadow-lg">
                  <BeakerIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-800">Break Sessions</h2>
                  <p className="text-xs sm:text-sm text-slate-500">Employee break records for {formatDate(new Date(selectedDate))}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={breakFilter}
                  onChange={(e) => setBreakFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                >
                  <option value="all">All Breaks</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full border-4 border-slate-200 border-t-purple-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <SparklesIcon className="h-5 w-5 text-purple-500 animate-pulse" />
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Mobile View - Cards */}
                <div className="space-y-3 lg:hidden">
                  <AnimatePresence mode="popLayout">
                    {filteredBreaks.map((row, index) => (
                      <motion.div
                        key={row._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.02 }}
                        className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-white to-slate-50 border border-slate-100 p-4 shadow-md hover:shadow-lg transition-all duration-300"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="relative">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-medium">
                                {row.user?.name?.charAt(0) || "U"}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-800">{row.user?.name || "Unknown"}</p>
                                <p className="text-xs text-slate-400">{row.user?.email}</p>
                              </div>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${BREAK_STATUS_STYLES[row.status] || BREAK_STATUS_STYLES.completed}`}>
                              {row.status}
                            </span>
                          </div>
                          
                          <div className="ml-10">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mb-2 ${BREAK_TYPE_STYLES[row.type]}`}>
                              {row.type} break
                            </span>
                            
                            <div className="grid grid-cols-2 gap-2 mb-2">
                              <div className="bg-white/80 rounded-lg p-2">
                                <p className="text-[10px] text-slate-400">Start</p>
                                <p className="text-xs font-medium text-slate-700">{formatTime(row.startTime)}</p>
                              </div>
                              <div className="bg-white/80 rounded-lg p-2">
                                <p className="text-[10px] text-slate-400">End</p>
                                <p className="text-xs font-medium text-slate-700">{formatTime(row.endTime)}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-500">Duration</span>
                              <span className="text-sm font-medium text-purple-600">{formatMinutes(row.durationMinutes)}</span>
                            </div>
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
                      <tr className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-slate-200">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Start Time</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">End Time</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Duration</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <AnimatePresence>
                        {filteredBreaks.map((row, index) => (
                          <motion.tr
                            key={row._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ delay: index * 0.03 }}
                            whileHover={{ backgroundColor: "rgba(241, 245, 249, 0.5)" }}
                            className="group transition-colors duration-200"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-medium">
                                  {row.user?.name?.charAt(0) || "U"}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-slate-800">{row.user?.name || "Unknown"}</p>
                                  <p className="text-xs text-slate-400">{row.user?.email || "-"}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${BREAK_TYPE_STYLES[row.type]}`}>
                                {row.type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">{formatTime(row.startTime)}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{formatTime(row.endTime)}</td>
                            <td className="px-4 py-3">
                              <span className="text-sm font-medium text-purple-600">{formatMinutes(row.durationMinutes)}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${BREAK_STATUS_STYLES[row.status]}`}>
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
                {filteredBreaks.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-12"
                  >
                    <div className="rounded-full bg-slate-100 p-4 mb-3">
                      <BeakerIcon className="h-8 w-8 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">No break sessions found</p>
                    <p className="text-xs text-slate-400 mt-1">Try selecting a different date</p>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </motion.section>

        {/* Summary Cards */}
        {!loading && attendance.length > 0 && (
          <motion.section 
            variants={itemVariants}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            <motion.div
              variants={cardVariants}
              whileHover="hover"
              className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 p-4 shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white/20 p-2">
                  <ClockIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-white/80">Avg Work Time</p>
                  <p className="text-xl font-bold text-white">
                    {attendance.length > 0 
                      ? formatMinutes(Math.round(summary.totalWorkMinutes / attendance.length))
                      : "0 min"}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={cardVariants}
              whileHover="hover"
              className="rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 p-4 shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white/20 p-2">
                  <ExclamationCircleIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-white/80">Total Late</p>
                  <p className="text-xl font-bold text-white">{formatMinutes(summary.totalLateMinutes)}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={cardVariants}
              whileHover="hover"
              className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 p-4 shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white/20 p-2">
                  <SparklesIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-white/80">Total Overtime</p>
                  <p className="text-xl font-bold text-white">{formatMinutes(summary.totalOvertimeMinutes)}</p>
                </div>
              </div>
            </motion.div>
          </motion.section>
        )}

      </div>
    </motion.div>
  );
}
