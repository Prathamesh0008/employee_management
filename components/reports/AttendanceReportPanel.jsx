"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarIcon,
  ChartBarIcon,
  DocumentArrowDownIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ClockIcon,
  SparklesIcon,
  ArrowPathIcon,
  FunnelIcon,
  SunIcon,
  MoonIcon,
  BriefcaseIcon,
  PresentationChartLineIcon,
} from "@heroicons/react/24/outline";

import { apiFetch } from "@/lib/client-api";

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
  holiday: "bg-[#A346FF]/15 text-[#A346FF] border-[#A346FF]",
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

export default function AttendanceReportPanel({ title, enableUserFilter = false }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [userId, setUserId] = useState("");
  const [report, setReport] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const loadEmployees = useCallback(async () => {
    if (!enableUserFilter) return;

    try {
      const response = await apiFetch(`/api/leaves/balance?year=${year}&limit=200`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) return;

      const people = (data.balances || [])
        .map((item) => item.user)
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name));
      setEmployees(people);
    } catch {
      // Ignore employee filter load failures.
    }
  }, [enableUserFilter, year]);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const query = new URLSearchParams({
        month: String(month),
        year: String(year),
      });

      if (enableUserFilter && userId) {
        query.set("userId", userId);
      }

      const response = await apiFetch(`/api/reports/attendance?${query.toString()}`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load report");
      }

      setReport(data);
      setSuccess("Report loaded successfully!");
      setTimeout(() => setSuccess(""), 2000);
    } catch (loadError) {
      setError(loadError.message || "Unable to load report");
    } finally {
      setLoading(false);
    }
  }, [enableUserFilter, month, userId, year]);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const csvLink = useMemo(() => {
    const query = new URLSearchParams({
      month: String(month),
      year: String(year),
    });

    if (enableUserFilter && userId) {
      query.set("userId", userId);
    }

    return `/api/reports/attendance/export?${query.toString()}`;
  }, [enableUserFilter, month, userId, year]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const attendanceRate = useMemo(() => {
    if (!report?.summary) return 0;
    const total = report.summary.presentCount + report.summary.halfDayCount;
    const possible = report.summary.totalRecords;
    return possible > 0 ? Math.round((total / possible) * 100) : 0;
  }, [report]);

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/30 p-3 sm:p-4 md:p-6"
      initial="hidden"
      animate={isLoaded ? "visible" : "hidden"}
      variants={containerVariants}
    >
      {/* Animated Background Elements */}
      <motion.div
        variants={floatingAnimation}
        animate="animate"
        className="fixed left-0 top-20 h-64 w-64 rounded-full bg-emerald-500/5 blur-3xl"
      />
      <motion.div
        variants={floatingAnimation}
        animate="animate"
        className="fixed bottom-20 right-0 h-80 w-80 rounded-full bg-teal-500/5 blur-3xl"
      />

      <div className="relative space-y-4 sm:space-y-6">
        {/* Header Section with Glass Effect */}
        <motion.section 
          variants={itemVariants}
          className="relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-xl border border-white/20 shadow-xl p-4 sm:p-6"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/5 to-teal-600/5" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                {title}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Monthly attendance summary with analytics and export options
              </p>
            </div>
            <div className="flex items-center gap-2">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-sm border border-slate-200"
              >
                <PresentationChartLineIcon className="h-4 w-4 text-emerald-500" />
                <span className="text-xs sm:text-sm font-medium text-slate-700">
                  {monthNames[month - 1]} {year}
                </span>
              </motion.div>
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
                <SparklesIcon className="h-5 w-5" />
                {error}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls Section */}
        <motion.section 
          variants={itemVariants}
          className="relative overflow-hidden rounded-2xl bg-white shadow-xl"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white" />
          
          <div className="relative p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 p-2.5 shadow-lg">
                <FunnelIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-800">Report Filters</h2>
                <p className="text-xs sm:text-sm text-slate-500">Customize your attendance report</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Month Selector */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  Month
                </label>
                <select
                  value={month}
                  onChange={(event) => setMonth(Number(event.target.value))}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
                >
                  {monthNames.map((name, index) => (
                    <option key={index + 1} value={index + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Selector */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  Year
                </label>
                <input
                  type="number"
                  value={year}
                  onChange={(event) => setYear(Number(event.target.value))}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
                  min={2000}
                  max={2100}
                />
              </div>

              {/* User Filter - Conditional */}
              {enableUserFilter && (
                <div className="space-y-1 lg:col-span-1">
                  <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                    <UserGroupIcon className="h-3 w-3" />
                    Team Member
                  </label>
                  <select
                    value={userId}
                    onChange={(event) => setUserId(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
                  >
                    <option value="">All Team Members</option>
                    {employees.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.name} ({item.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-end gap-2">
                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  type="button"
                  onClick={() => void loadReport()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </motion.button>
                
                <motion.a
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  href={csvLink}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:from-emerald-700 hover:to-teal-700 transition-all duration-300"
                >
                  <DocumentArrowDownIcon className="h-4 w-4" />
                  Export CSV
                </motion.a>
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
              icon: ChartBarIcon, 
              label: "Total Records", 
              value: report?.summary?.totalRecords || 0,
              subValue: `${attendanceRate}% attendance rate`,
              color: "indigo",
              gradient: "from-[#A346FF] to-[#A346FF]"
            },
            { 
              icon: CheckCircleIcon, 
              label: "Present", 
              value: report?.summary?.presentCount || 0,
              color: "emerald",
              gradient: "from-emerald-500 to-green-500"
            },
            { 
              icon: SunIcon, 
              label: "Half Day", 
              value: report?.summary?.halfDayCount || 0,
              color: "amber",
              gradient: "from-amber-500 to-orange-500"
            },
            { 
              icon: BriefcaseIcon, 
              label: "Work Minutes", 
              value: formatMinutes(report?.summary?.totalWorkMinutes || 0),
              color: "blue",
              gradient: "from-[#A346FF] to-[#A346FF]"
            },
            { 
              icon: MoonIcon, 
              label: "Break Minutes", 
              value: formatMinutes(report?.summary?.totalBreakMinutes || 0),
              color: "purple",
              gradient: "from-[#A346FF] to-pink-500"
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

        {/* Attendance Records Table */}
        <motion.section 
          variants={itemVariants}
          className="relative overflow-hidden rounded-2xl bg-white shadow-xl"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#A346FF]/50 to-[#A346FF]/100" />
          
          <div className="relative p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-xl bg-gradient-to-r from-[#A346FF] to-[#A346FF] p-2.5 shadow-lg">
                <UserGroupIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-800">Attendance Records</h2>
                <p className="text-xs sm:text-sm text-slate-500">Detailed attendance data for {monthNames[month - 1]} {year}</p>
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
                    {(report?.records || []).map((row, index) => (
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
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-[#A346FF] to-[#A346FF] flex items-center justify-center text-white text-xs font-medium">
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
                            
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500">Work: {formatMinutes(row.totalWorkMinutes)}</span>
                              <span className="text-slate-500">Break: {formatMinutes(row.breakMinutes)}</span>
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
                      <tr className="bg-gradient-to-r from-[#A346FF] to-[#A346FF] border-b border-slate-200">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Shift Start</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Shift End</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Work Time</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Break Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <AnimatePresence>
                        {(report?.records || []).map((row, index) => (
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
                                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-[#A346FF] to-[#A346FF] flex items-center justify-center text-white text-xs font-medium">
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
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[row.status] || STATUS_STYLES.present}`}>
                                {row.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm font-medium text-[#A346FF]">
                                {formatMinutes(row.totalWorkMinutes)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm font-medium text-[#A346FF]">
                                {formatMinutes(row.breakMinutes)}
                              </span>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>

                {/* Empty State */}
                {(report?.records || []).length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-12"
                  >
                    <div className="rounded-full bg-slate-100 p-4 mb-3">
                      <ChartBarIcon className="h-8 w-8 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">No attendance records found</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting your filters</p>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </motion.section>

        {/* Summary Section - Optional */}
        {report?.summary && (
          <motion.section 
            variants={itemVariants}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            <motion.div
              variants={cardVariants}
              whileHover="hover"
              className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 p-4 shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white/20 p-2">
                  <CheckCircleIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-white/80">Attendance Rate</p>
                  <p className="text-xl font-bold text-white">{attendanceRate}%</p>
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
                  <SunIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-white/80">Avg Work Time</p>
                  <p className="text-xl font-bold text-white">
                    {report.summary.totalRecords > 0 
                      ? formatMinutes(Math.round(report.summary.totalWorkMinutes / report.summary.totalRecords))
                      : "0 min"}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={cardVariants}
              whileHover="hover"
              className="rounded-xl bg-gradient-to-br from-[#A346FF] to-pink-500 p-4 shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white/20 p-2">
                  <MoonIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-white/80">Avg Break Time</p>
                  <p className="text-xl font-bold text-white">
                    {report.summary.totalRecords > 0 
                      ? formatMinutes(Math.round(report.summary.totalBreakMinutes / report.summary.totalRecords))
                      : "0 min"}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.section>
        )}
      </div>
    </motion.div>
  );
}
