"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarIcon,
  ClockIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserGroupIcon,
  ChartBarIcon,
  SparklesIcon,
  ArrowPathIcon,
  BanknotesIcon,
  ShieldCheckIcon,
  PencilSquareIcon,
  FunnelIcon,
  SunIcon,
  CloudIcon,
  BriefcaseIcon,
} from "@heroicons/react/24/outline";

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatDateRange(fromDate, toDate) {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  
  if (from.toDateString() === to.toDateString()) {
    return formatDate(fromDate);
  }
  
  return `${formatDate(fromDate)} - ${formatDate(toDate)}`;
}

const LEAVE_TYPES = ["casual", "sick", "paid", "unpaid"];

const LEAVE_TYPE_CONFIG = {
  casual: { icon: SunIcon, color: "amber", label: "Casual Leave", gradient: "from-amber-500 to-orange-500" },
  sick: { icon: CloudIcon, color: "blue", label: "Sick Leave", gradient: "from-blue-500 to-indigo-500" },
  paid: { icon: BanknotesIcon, color: "emerald", label: "Paid Leave", gradient: "from-emerald-500 to-green-500" },
  unpaid: { icon: BriefcaseIcon, color: "slate", label: "Unpaid Leave", gradient: "from-slate-500 to-gray-500" },
};

const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
  cancelled: "bg-slate-50 text-slate-700 border-slate-200",
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

export default function LeaveReviewPanel({
  title,
  canReview = false,
  canManageBalance = false,
}) {
  const currentYear = new Date().getUTCFullYear();

  const [leaves, setLeaves] = useState([]);
  const [balances, setBalances] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [year, setYear] = useState(currentYear);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [policyLoading, setPolicyLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [encashForm, setEncashForm] = useState({
    userId: "",
    leaveType: "paid",
    days: 1,
    amountPerDay: 0,
  });

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const leaveQuery = statusFilter ? `?status=${statusFilter}&limit=100` : "?limit=100";
      const balanceQuery = `?year=${year}&limit=100`;
      const [leaveResponse, balanceResponse] = await Promise.all([
        apiFetch(`/api/leaves${leaveQuery}`, { cache: "no-store" }),
        apiFetch(`/api/leaves/balance${balanceQuery}`, { cache: "no-store" }),
      ]);

      const [leaveData, balanceData] = await Promise.all([
        leaveResponse.json(),
        balanceResponse.json(),
      ]);

      if (!leaveResponse.ok) {
        throw new Error(leaveData.error || "Failed to load leave requests");
      }

      if (!balanceResponse.ok) {
        throw new Error(balanceData.error || "Failed to load leave balances");
      }

      setLeaves(leaveData.leaves || []);
      setBalances(balanceData.balances || []);
    } catch (loadError) {
      setError(loadError.message || "Unable to load leave data");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, year]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const reviewLeave = async (leaveId, status) => {
    const comment = window.prompt(
      status === "approved"
        ? "Add optional approval comment:"
        : "Add rejection reason (optional):",
      "",
    );

    setActionLoading(`${status}-${leaveId}`);
    setError("");
    setSuccess("");

    try {
      const response = await apiFetch(`/api/leaves/${leaveId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewerComment: comment || "" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to review leave");
      }

      setSuccess(`Leave request ${status} successfully!`);
      await loadData();
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (reviewError) {
      setError(reviewError.message || "Unable to review leave");
    } finally {
      setActionLoading("");
    }
  };

  const updateBalance = async (userId, leaveType, currentValue) => {
    if (!canManageBalance) return;

    const input = window.prompt(`Set ${leaveType} allocation for ${year}:`, String(currentValue));

    if (input === null) return;

    const nextValue = Number(input);

    if (!Number.isFinite(nextValue) || nextValue < 0) {
      setError("Allocation must be a non-negative number");
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await apiFetch("/api/leaves/balance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          year,
          allocated: {
            [leaveType]: Math.floor(nextValue),
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update leave balance");
      }

      setSuccess(`Leave balance updated for ${leaveType}`);
      await loadData();
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (updateError) {
      setError(updateError.message || "Unable to update leave balance");
    }
  };

  const runPolicy = async () => {
    if (!canManageBalance) return;

    setPolicyLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await apiFetch("/api/leaves/policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          month: new Date().getUTCMonth() + 1,
          applyCarryForward: true,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to run leave policy");
      }

      setSuccess("Leave policy applied successfully!");
      await loadData();
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (policyError) {
      setError(policyError.message || "Unable to run leave policy");
    } finally {
      setPolicyLoading(false);
    }
  };

  const runEncash = async (event) => {
    event.preventDefault();

    if (!canManageBalance) return;

    setError("");
    setSuccess("");
    setActionLoading("encash");

    try {
      const response = await apiFetch("/api/leaves/encash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: encashForm.userId,
          leaveType: encashForm.leaveType,
          days: Number(encashForm.days),
          amountPerDay: Number(encashForm.amountPerDay),
          year,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process leave encashment");
      }

      setSuccess("Leave encashment processed successfully!");
      await loadData();
      
      setEncashForm({
        userId: "",
        leaveType: "paid",
        days: 1,
        amountPerDay: 0,
      });
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (encashError) {
      setError(encashError.message || "Unable to process leave encashment");
    } finally {
      setActionLoading("");
    }
  };

  const summary = useMemo(() => {
    const pending = leaves.filter((row) => row.status === "pending").length;
    const approved = leaves.filter((row) => row.status === "approved").length;
    const rejected = leaves.filter((row) => row.status === "rejected").length;

    return { total: leaves.length, pending, approved, rejected };
  }, [leaves]);

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 p-3 sm:p-4 md:p-6"
      initial="hidden"
      animate={isLoaded ? "visible" : "hidden"}
      variants={containerVariants}
    >
      {/* Animated Background Elements */}
      <motion.div
        variants={floatingAnimation}
        animate="animate"
        className="fixed left-0 top-20 h-64 w-64 rounded-full bg-indigo-500/5 blur-3xl"
      />
      <motion.div
        variants={floatingAnimation}
        animate="animate"
        className="fixed bottom-20 right-0 h-80 w-80 rounded-full bg-purple-500/5 blur-3xl"
      />

      <div className="relative space-y-4 sm:space-y-6">
        {/* Header Section with Glass Effect */}
        <motion.section 
          variants={itemVariants}
          className="relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-xl border border-white/20 shadow-xl p-4 sm:p-6"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/5 to-purple-600/5" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {title}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                View leave applications and yearly leave balances
              </p>
            </div>
            <div className="flex items-center gap-2">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-sm border border-slate-200"
              >
                <CalendarIcon className="h-4 w-4 text-indigo-500" />
                <span className="text-xs sm:text-sm font-medium text-slate-700">
                  {year}
                </span>
              </motion.div>
              {canManageBalance && (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5"
                >
                  <ShieldCheckIcon className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-medium text-emerald-700">Manager</span>
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
                <XCircleIcon className="h-5 w-5" />
                {error}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Cards */}
        <motion.section 
          variants={itemVariants}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {[
            { icon: ChartBarIcon, label: "Total Requests", value: summary.total, color: "indigo", gradient: "from-indigo-500 to-purple-500" },
            { icon: ClockIcon, label: "Pending", value: summary.pending, color: "amber", gradient: "from-amber-500 to-orange-500" },
            { icon: CheckCircleIcon, label: "Approved", value: summary.approved, color: "emerald", gradient: "from-emerald-500 to-green-500" },
            { icon: XCircleIcon, label: "Rejected", value: summary.rejected, color: "rose", gradient: "from-rose-500 to-pink-500" },
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
                <p className={`mt-1 text-2xl sm:text-3xl font-bold text-${stat.color}-600`}>{stat.value}</p>
              </div>
              <div className="absolute -bottom-2 -right-2 h-16 w-16 rounded-full bg-gradient-to-br from-slate-100 to-white opacity-50 blur-2xl" />
            </motion.div>
          ))}
        </motion.section>

        {/* Leave Balances Section */}
        <motion.section 
          variants={itemVariants}
          className="relative overflow-hidden rounded-2xl bg-white shadow-xl"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-purple-50/50" />
          
          <div className="relative p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 p-2.5 shadow-lg">
                  <UserGroupIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-800">Leave Balances</h2>
                  <p className="text-xs sm:text-sm text-slate-500">Employee leave allocations and usage</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Year:</span>
                <input
                  type="number"
                  min={2000}
                  max={2100}
                  value={year}
                  onChange={(event) => setYear(Number(event.target.value))}
                  className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                    {LEAVE_TYPES.map((type) => {
                      const config = LEAVE_TYPE_CONFIG[type];
                      return (
                        <th key={type} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          <div className="flex items-center gap-1">
                            <config.icon className={`h-3 w-3 text-${config.color}-500`} />
                            {config.label}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <AnimatePresence>
                    {balances.map((item, index) => (
                      <motion.tr
                        key={`${item.user?._id}-${item.year}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ backgroundColor: "rgba(241, 245, 249, 0.5)" }}
                        className="group transition-colors duration-200"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                              {item.user?.name?.charAt(0) || "U"}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-800">{item.user?.name || "Unknown"}</p>
                              <p className="text-xs text-slate-400">{item.user?.email || "-"}</p>
                            </div>
                          </div>
                        </td>
                        {LEAVE_TYPES.map((leaveType) => {
                          const config = LEAVE_TYPE_CONFIG[leaveType];
                          const remaining = item.remaining?.[leaveType] ?? 0;
                          const used = item.used?.[leaveType] ?? 0;
                          const allocated = item.allocated?.[leaveType] ?? 0;
                          const percentage = allocated > 0 ? Math.round((used / allocated) * 100) : 0;

                          return (
                            <td key={leaveType} className="px-4 py-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-semibold text-${config.color}-600`}>{remaining}</span>
                                  {canManageBalance && (
                                    <motion.button
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      type="button"
                                      onClick={() => updateBalance(item.user?._id, leaveType, allocated)}
                                      className="rounded-lg border border-slate-200 bg-white px-1.5 py-0.5 text-xs hover:bg-slate-50 transition-colors"
                                    >
                                      Set
                                    </motion.button>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 text-xs">
                                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${percentage}%` }}
                                      transition={{ duration: 0.5 }}
                                      className={`h-full rounded-full bg-gradient-to-r ${config.gradient}`}
                                    />
                                  </div>
                                  <span className="text-slate-400 text-[10px]">
                                    {used}/{allocated}
                                  </span>
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        </motion.section>

        {/* Manager Controls - Policy & Encashment */}
        {canManageBalance && (
          <motion.section 
            variants={itemVariants}
            className="relative overflow-hidden rounded-2xl bg-white shadow-xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-teal-50/50" />
            
            <div className="relative p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 p-2.5 shadow-lg">
                  <SparklesIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-800">Leave Management</h2>
                  <p className="text-xs sm:text-sm text-slate-500">Policy automation and leave encashment</p>
                </div>
              </div>

              {/* Policy Automation */}
              <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-indigo-800">Leave Policy Automation</h3>
                    <p className="text-xs text-indigo-600 mt-1">
                      Apply monthly accrual and carry-forward rules for {year}
                    </p>
                  </div>
                  <motion.button
                    type="button"
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={() => void runPolicy()}
                    disabled={policyLoading}
                    className="relative overflow-hidden rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-lg disabled:opacity-50 transition-all duration-300"
                  >
                    <span className="relative flex items-center justify-center gap-2">
                      {policyLoading ? (
                        <>
                          <ArrowPathIcon className="h-4 w-4 animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <SparklesIcon className="h-4 w-4" />
                          Run Policy
                        </>
                      )}
                    </span>
                  </motion.button>
                </div>
              </div>

              {/* Leave Encashment Form */}
              <form onSubmit={runEncash} className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Leave Encashment</h3>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <select
                    required
                    value={encashForm.userId}
                    onChange={(event) =>
                      setEncashForm((prev) => ({ ...prev, userId: event.target.value }))
                    }
                    className="lg:col-span-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
                  >
                    <option value="">Select employee</option>
                    {balances.map((item) => (
                      <option key={item.user?._id} value={item.user?._id}>
                        {item.user?.name} ({item.user?.role})
                      </option>
                    ))}
                  </select>

                  <select
                    value={encashForm.leaveType}
                    onChange={(event) =>
                      setEncashForm((prev) => ({ ...prev, leaveType: event.target.value }))
                    }
                    className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
                  >
                    {LEAVE_TYPES.map((type) => {
                      const config = LEAVE_TYPE_CONFIG[type];
                      return (
                        <option key={type} value={type}>
                          {config.label}
                        </option>
                      );
                    })}
                  </select>

                  <input
                    type="number"
                    min={1}
                    value={encashForm.days}
                    onChange={(event) =>
                      setEncashForm((prev) => ({ ...prev, days: Number(event.target.value) || 1 }))
                    }
                    className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
                    placeholder="Days"
                  />

                  <input
                    type="number"
                    min={0}
                    value={encashForm.amountPerDay}
                    onChange={(event) =>
                      setEncashForm((prev) => ({ ...prev, amountPerDay: Number(event.target.value) || 0 }))
                    }
                    className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
                    placeholder="Amount/Day"
                  />
                </div>

                <div className="flex justify-end">
                  <motion.button
                    type="submit"
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    disabled={actionLoading === "encash"}
                    className="relative overflow-hidden rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2.5 text-sm font-medium text-white shadow-lg disabled:opacity-50 transition-all duration-300"
                  >
                    <span className="relative flex items-center justify-center gap-2">
                      {actionLoading === "encash" ? (
                        <>
                          <ArrowPathIcon className="h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <BanknotesIcon className="h-4 w-4" />
                          Process Encashment
                        </>
                      )}
                    </span>
                  </motion.button>
                </div>
              </form>
            </div>
          </motion.section>
        )}

        {/* Leave Requests Section */}
        <motion.section 
          variants={itemVariants}
          className="relative overflow-hidden rounded-2xl bg-white shadow-xl"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-pink-50/50" />
          
          <div className="relative p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 p-2.5 shadow-lg">
                  <DocumentTextIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-800">Leave Requests</h2>
                  <p className="text-xs sm:text-sm text-slate-500">Review and manage employee leave applications</p>
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
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="w-full sm:w-auto rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                  >
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </motion.div>
              )}
            </AnimatePresence>

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
                    {leaves.map((leave, index) => {
                      const config = LEAVE_TYPE_CONFIG[leave.leaveType];
                      const Icon = config?.icon || DocumentTextIcon;
                      
                      return (
                        <motion.div
                          key={leave._id}
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
                                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                                  {leave.user?.name?.charAt(0) || "U"}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-slate-800">{leave.user?.name || "Unknown"}</p>
                                  <p className="text-xs text-slate-400">{leave.user?.email}</p>
                                </div>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[leave.status] || STATUS_STYLES.pending}`}>
                                {leave.status}
                              </span>
                            </div>
                            
                            <div className="ml-10 mb-2">
                              <div className="flex items-center gap-1 mb-1">
                                <Icon className={`h-3 w-3 text-${config?.color}-500`} />
                                <span className="text-xs font-medium text-slate-600 capitalize">{config?.label || leave.leaveType}</span>
                              </div>
                              <p className="text-xs text-slate-500">
                                {formatDateRange(leave.fromDate, leave.toDate)}
                                <span className="ml-1 font-medium text-slate-600">({leave.totalDays} day{leave.totalDays > 1 ? 's' : ''})</span>
                              </p>
                              <p className="text-xs text-slate-600 mt-1">{leave.reason}</p>
                              {leave.reviewedBy?.name && (
                                <p className="text-xs text-slate-400 mt-1">Reviewed by: {leave.reviewedBy.name}</p>
                              )}
                            </div>

                            {canReview && leave.status === "pending" && (
                              <div className="ml-10 mt-3 flex gap-2">
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  type="button"
                                  onClick={() => reviewLeave(leave._id, "approved")}
                                  disabled={actionLoading === `approved-${leave._id}`}
                                  className="flex-1 rounded-lg bg-gradient-to-r from-emerald-500 to-green-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm disabled:opacity-50 transition-all duration-200"
                                >
                                  {actionLoading === `approved-${leave._id}` ? (
                                    <ArrowPathIcon className="h-3 w-3 animate-spin mx-auto" />
                                  ) : (
                                    "Approve"
                                  )}
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  type="button"
                                  onClick={() => reviewLeave(leave._id, "rejected")}
                                  disabled={actionLoading === `rejected-${leave._id}`}
                                  className="flex-1 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm disabled:opacity-50 transition-all duration-200"
                                >
                                  {actionLoading === `rejected-${leave._id}` ? (
                                    <ArrowPathIcon className="h-3 w-3 animate-spin mx-auto" />
                                  ) : (
                                    "Reject"
                                  )}
                                </motion.button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto rounded-xl border border-slate-100">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-slate-200">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Period</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Reason</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Reviewer</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <AnimatePresence>
                        {leaves.map((leave, index) => {
                          const config = LEAVE_TYPE_CONFIG[leave.leaveType];
                          const Icon = config?.icon || DocumentTextIcon;
                          
                          return (
                            <motion.tr
                              key={leave._id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: -20 }}
                              transition={{ delay: index * 0.03 }}
                              whileHover={{ backgroundColor: "rgba(241, 245, 249, 0.5)" }}
                              className="group transition-colors duration-200"
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                                    {leave.user?.name?.charAt(0) || "U"}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-slate-800">{leave.user?.name || "Unknown"}</p>
                                    <p className="text-xs text-slate-400">{leave.user?.email || "-"}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-sm text-slate-600">{formatDateRange(leave.fromDate, leave.toDate)}</p>
                                <p className="text-xs text-slate-400 mt-1">{leave.totalDays} day{leave.totalDays > 1 ? 's' : ''}</p>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1">
                                  <Icon className={`h-4 w-4 text-${config?.color}-500`} />
                                  <span className="text-sm capitalize text-slate-600">{config?.label || leave.leaveType}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-sm text-slate-600 max-w-xs truncate">{leave.reason}</p>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[leave.status] || STATUS_STYLES.pending}`}>
                                  {leave.status}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-sm text-slate-600">{leave.reviewedBy?.name || "-"}</p>
                              </td>
                              <td className="px-4 py-3">
                                {canReview && leave.status === "pending" ? (
                                  <div className="flex gap-2">
                                    <motion.button
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      type="button"
                                      onClick={() => reviewLeave(leave._id, "approved")}
                                      disabled={actionLoading === `approved-${leave._id}`}
                                      className="rounded-lg bg-gradient-to-r from-emerald-500 to-green-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm disabled:opacity-50 transition-all duration-200"
                                    >
                                      {actionLoading === `approved-${leave._id}` ? (
                                        <ArrowPathIcon className="h-3 w-3 animate-spin" />
                                      ) : (
                                        "Approve"
                                      )}
                                    </motion.button>
                                    <motion.button
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      type="button"
                                      onClick={() => reviewLeave(leave._id, "rejected")}
                                      disabled={actionLoading === `rejected-${leave._id}`}
                                      className="rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm disabled:opacity-50 transition-all duration-200"
                                    >
                                      {actionLoading === `rejected-${leave._id}` ? (
                                        <ArrowPathIcon className="h-3 w-3 animate-spin" />
                                      ) : (
                                        "Reject"
                                      )}
                                    </motion.button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400">-</span>
                                )}
                              </td>
                            </motion.tr>
                          );
                        })}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>

                {/* Empty State */}
                {leaves.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-12"
                  >
                    <div className="rounded-full bg-slate-100 p-4 mb-3">
                      <DocumentTextIcon className="h-8 w-8 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">No leave requests found</p>
                    <p className="text-xs text-slate-400 mt-1">Apply filters to see different results</p>
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