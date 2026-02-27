"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarIcon,
  ClockIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilSquareIcon,
  ArrowPathIcon,
  SparklesIcon,
  SunIcon,
  CloudIcon,
  BriefcaseIcon,
  BanknotesIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";

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

export default function EmployeeLeavePanel() {
  const [leaves, setLeaves] = useState([]);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [form, setForm] = useState({
    fromDate: "",
    toDate: "",
    leaveType: "casual",
    reason: "",
  });

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const query = statusFilter ? `?status=${statusFilter}&limit=100` : "?limit=100";
      const [leaveResponse, balanceResponse] = await Promise.all([
        apiFetch(`/api/leaves${query}`, { cache: "no-store" }),
        apiFetch("/api/leaves/balance", { cache: "no-store" }),
      ]);

      const [leaveData, balanceData] = await Promise.all([
        leaveResponse.json(),
        balanceResponse.json(),
      ]);

      if (!leaveResponse.ok) {
        throw new Error(leaveData.error || "Failed to load leaves");
      }

      if (!balanceResponse.ok) {
        throw new Error(balanceData.error || "Failed to load leave balance");
      }

      setLeaves(leaveData.leaves || []);
      setBalance(balanceData.balance || null);
    } catch (loadError) {
      setError(loadError.message || "Unable to load leave data");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const submitLeave = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await apiFetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit leave");
      }

      setSuccess("Leave application submitted successfully!");
      setForm({ fromDate: "", toDate: "", leaveType: "casual", reason: "" });
      await loadData();
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (submitError) {
      setError(submitError.message || "Unable to submit leave");
    } finally {
      setSubmitting(false);
    }
  };

  const cancelLeave = async (leaveId) => {
    if (!window.confirm("Are you sure you want to cancel this leave request?")) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await apiFetch(`/api/leaves/${leaveId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel leave");
      }

      setSuccess("Leave request cancelled successfully!");
      await loadData();
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (cancelError) {
      setError(cancelError.message || "Unable to cancel leave");
    }
  };

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
                Leave Application
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Apply for leave and track manager approval status
              </p>
            </div>
            <div className="flex items-center gap-2">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-sm border border-slate-200"
              >
                <CalendarIcon className="h-4 w-4 text-emerald-500" />
                <span className="text-xs sm:text-sm font-medium text-slate-700">
                  {new Date().getFullYear()}
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
                <XCircleIcon className="h-5 w-5" />
                {error}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Leave Balance Section */}
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
                <h2 className="text-lg sm:text-xl font-bold text-slate-800">Leave Balance</h2>
                <p className="text-xs sm:text-sm text-slate-500">Year {balance?.year || new Date().getUTCFullYear()}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {LEAVE_TYPES.map((leaveType) => {
                const config = LEAVE_TYPE_CONFIG[leaveType];
                const Icon = config.icon;
                const remaining = balance?.remaining?.[leaveType] ?? 0;
                const used = balance?.used?.[leaveType] ?? 0;
                const allocated = balance?.allocated?.[leaveType] ?? 0;
                const percentage = allocated > 0 ? Math.round((used / allocated) * 100) : 0;

                return (
                  <motion.div
                    key={leaveType}
                    variants={cardVariants}
                    whileHover="hover"
                    className="group relative overflow-hidden rounded-xl bg-white border border-slate-100 p-4 shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br from-${config.color}-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                    
                    <div className="relative">
                      <div className="flex items-center justify-between mb-3">
                        <div className={`rounded-lg bg-${config.color}-100 p-2`}>
                          <Icon className={`h-5 w-5 text-${config.color}-600`} />
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full bg-${config.color}-50 text-${config.color}-700`}>
                          {config.label}
                        </span>
                      </div>

                      <div className="mt-2">
                        <div className="flex items-baseline justify-between">
                          <p className="text-2xl sm:text-3xl font-bold text-slate-800">{remaining}</p>
                          <p className="text-xs text-slate-400">remaining</p>
                        </div>
                        
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-slate-500">Used</span>
                            <span className="font-medium text-slate-700">{used}/{allocated}</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 0.5, delay: 0.2 }}
                              className={`h-full rounded-full bg-gradient-to-r ${config.gradient}`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.section>

        {/* Apply Leave Form */}
        <motion.section 
          variants={itemVariants}
          className="relative overflow-hidden rounded-2xl bg-white shadow-xl"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/50" />
          
          <div className="relative p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 p-2.5 shadow-lg">
                <PencilSquareIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-800">Apply For Leave</h2>
                <p className="text-xs sm:text-sm text-slate-500">Submit a new leave request</p>
              </div>
            </div>

            <form className="space-y-4" onSubmit={submitLeave}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* From Date */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                    <CalendarIcon className="h-4 w-4 text-slate-400" />
                    From Date
                  </label>
                  <input
                    type="date"
                    name="fromDate"
                    required
                    value={form.fromDate}
                    onChange={onChange}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                  />
                </div>

                {/* To Date */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                    <CalendarIcon className="h-4 w-4 text-slate-400" />
                    To Date
                  </label>
                  <input
                    type="date"
                    name="toDate"
                    required
                    value={form.toDate}
                    onChange={onChange}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                  />
                </div>

                {/* Leave Type */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                    <DocumentTextIcon className="h-4 w-4 text-slate-400" />
                    Leave Type
                  </label>
                  <select
                    name="leaveType"
                    value={form.leaveType}
                    onChange={onChange}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                  >
                    {LEAVE_TYPES.map((item) => {
                      const config = LEAVE_TYPE_CONFIG[item];
                      return (
                        <option key={item} value={item}>
                          {config.label}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Reason */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                    <DocumentTextIcon className="h-4 w-4 text-slate-400" />
                    Reason
                  </label>
                  <textarea
                    name="reason"
                    required
                    rows={3}
                    value={form.reason}
                    onChange={onChange}
                    placeholder="Please provide a reason for your leave request..."
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200 resize-none"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <motion.button
                  type="submit"
                  disabled={submitting}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  className="relative overflow-hidden rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-2.5 text-sm font-medium text-white shadow-lg disabled:opacity-50 transition-all duration-300"
                >
                  <span className="relative flex items-center justify-center gap-2">
                    {submitting ? (
                      <>
                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <PencilSquareIcon className="h-4 w-4" />
                        Submit Leave Request
                      </>
                    )}
                  </span>
                </motion.button>
              </div>
            </form>
          </div>
        </motion.section>

        {/* Leave History Section */}
        <motion.section 
          variants={itemVariants}
          className="relative overflow-hidden rounded-2xl bg-white shadow-xl"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-pink-50/50" />
          
          <div className="relative p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 p-2.5 shadow-lg">
                  <ClockIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-800">Leave History</h2>
                  <p className="text-xs sm:text-sm text-slate-500">Your leave requests and their status</p>
                </div>
              </div>

              {/* Filters */}
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
                                <div className={`rounded-lg bg-${config?.color}-100 p-1.5`}>
                                  <Icon className={`h-4 w-4 text-${config?.color}-600`} />
                                </div>
                                <p className="text-sm font-bold text-slate-800 capitalize">
                                  {config?.label || leave.leaveType}
                                </p>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[leave.status] || STATUS_STYLES.pending}`}>
                                {leave.status}
                              </span>
                            </div>
                            
                            <p className="text-xs text-slate-500 mb-2">
                              {formatDateRange(leave.fromDate, leave.toDate)}
                              <span className="ml-1 font-medium text-slate-600">({leave.totalDays} day{leave.totalDays > 1 ? 's' : ''})</span>
                            </p>
                            
                            <p className="text-xs text-slate-600 mb-3 line-clamp-2">{leave.reason}</p>
                            
                            {leave.status === "pending" && (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => cancelLeave(leave._id)}
                                className="mt-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100 transition-colors"
                              >
                                Cancel Request
                              </motion.button>
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
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Period</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Reason</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
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
                              <td className="px-6 py-4">
                                <p className="text-sm font-medium text-slate-700">
                                  {formatDateRange(leave.fromDate, leave.toDate)}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">{leave.totalDays} day{leave.totalDays > 1 ? 's' : ''}</p>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className={`rounded-lg bg-${config?.color}-100 p-1.5`}>
                                    <Icon className={`h-4 w-4 text-${config?.color}-600`} />
                                  </div>
                                  <span className="text-sm capitalize text-slate-600">
                                    {config?.label || leave.leaveType}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm text-slate-600 max-w-xs truncate">{leave.reason}</p>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[leave.status] || STATUS_STYLES.pending}`}>
                                  {leave.status}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                {leave.status === "pending" ? (
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => cancelLeave(leave._id)}
                                    className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100 transition-colors"
                                  >
                                    Cancel
                                  </motion.button>
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
                      <CalendarIcon className="h-8 w-8 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">No leave requests found</p>
                    <p className="text-xs text-slate-400 mt-1">Submit your first leave request above</p>
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