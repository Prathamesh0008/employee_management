"use client";

import EmployeeDashboardAttendanceSection from "@/components/attendance/EmployeeDashboardAttendanceSection";
import TaskDetailsModal from "@/components/tasks/TaskDetailsModal";
import { apiFetch } from "@/lib/client-api";
import {
  getTaskProgressClasses,
  getTaskProgressPercent,
  getTaskTimingText,
  shouldShowTaskProgress,
} from "@/lib/task-progress";
import { useMemo, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircleIcon, 
  ClockIcon, 
  ChartBarIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  EyeIcon,
  MoonIcon,
  SunIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";
import debounce from "lodash/debounce";

const STATUS_OPTIONS = ["pending", "in-progress", "completed"];
const PRIORITY_OPTIONS = ["low", "medium", "high"];
const AUTO_REFRESH_MS = 30000; // Increased to 30s for better performance

const STATUS_STYLES = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "in-progress": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const PRIORITY_STYLES = {
  low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  high: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

const PRIORITY_ICONS = {
  low: "🟢",
  medium: "🟡",
  high: "🔴",
};

function formatStatusLabel(status) {
  return String(status)
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function truncateWords(text, maxWords = 2, maxChars = 28) {
  const value = String(text || "").trim();
  if (!value) return "-";
  const words = value.split(/\s+/);
  const sliced = words.slice(0, maxWords).join(" ");
  const shortByWords = words.length > maxWords ? `${sliced}...` : sliced;
  if (shortByWords.length <= maxChars) return shortByWords;
  return `${shortByWords.slice(0, maxChars).trimEnd()}...`;
}

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

export default function EmployeeTasksPanel({ initialTasks }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [error, setError] = useState("");
  const [savingTaskId, setSavingTaskId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState(() => {
    const map = {};
    for (const task of initialTasks) {
      map[task._id] = task.status;
    }
    return map;
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [taskSearch, setTaskSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [now, setNow] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Debounce search input
  useEffect(() => {
    const handler = debounce(() => {
      setDebouncedSearch(taskSearch);
    }, 300);
    handler();
    return () => handler.cancel();
  }, [taskSearch]);

  const loadTasks = useCallback(async ({ silent = false, showRefreshing = false } = {}) => {
    if (showRefreshing) setIsRefreshing(true);
    try {
      const response = await apiFetch("/api/tasks?limit=200", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        if (!silent) {
          setError(data.error || "Failed to refresh tasks");
        }
        return;
      }

      const latestTasks = data.tasks || [];
      setTasks(latestTasks);

      const latestStatusMap = {};
      for (const task of latestTasks) {
        latestStatusMap[task._id] = task.status;
      }
      setSelectedStatus(latestStatusMap);
    } catch {
      if (!silent) {
        setError("Unable to refresh tasks");
      }
    } finally {
      if (showRefreshing) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadTasks({ silent: true });
      }
    }, AUTO_REFRESH_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void loadTasks({ silent: true });
      }
    };

    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadTasks]);

  const counts = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((task) => task.status === "completed").length;
    const inProgress = tasks.filter((task) => task.status === "in-progress").length;
    const pending = tasks.filter((task) => task.status === "pending").length;

    return { total, completed, inProgress, pending };
  }, [tasks]);

  const completionRate = useMemo(() => {
    return counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0;
  }, [counts]);

  const highPriorityTasks = useMemo(() => {
    return tasks.filter((task) => task.priority === "high" && task.status !== "completed");
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const searchValue = debouncedSearch.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
      const matchesSearch =
        !searchValue ||
        [task.title, task.description, task.assignedBy?.name]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(searchValue));

      return matchesStatus && matchesPriority && matchesSearch;
    });
  }, [debouncedSearch, priorityFilter, statusFilter, tasks]);

  const activeFilterCount = useMemo(() => {
    return [statusFilter !== "all", priorityFilter !== "all", debouncedSearch !== ""].filter(Boolean).length;
  }, [debouncedSearch, priorityFilter, statusFilter]);

  const updateTask = useCallback(async (taskId) => {
    const status = selectedStatus[taskId];

    setSavingTaskId(taskId);
    setError("");

    try {
      const response = await apiFetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to update task");
        return;
      }

      if (data.task) {
        setTasks((prev) => prev.map((task) => (task._id === data.task._id ? data.task : task)));
        setSelectedStatus((prev) => ({
          ...prev,
          [taskId]: data.task.status,
        }));
        setSelectedTask((prev) => (prev?._id === data.task._id ? data.task : prev));
      }

      await loadTasks({ silent: true });
    } catch {
      setError("Unable to update task");
    } finally {
      setSavingTaskId("");
    }
  }, [loadTasks, selectedStatus]);

  const openTaskDetails = (task) => {
    setSelectedTask(task);
  };

  const closeTaskDetails = () => {
    setSelectedTask(null);
  };

  const handleTaskUpdated = useCallback((updatedTask) => {
    setTasks((prev) => prev.map((task) => (task._id === updatedTask._id ? updatedTask : task)));
    setSelectedTask(updatedTask);
  }, []);

  const resetFilters = () => {
    setTaskSearch("");
    setDebouncedSearch("");
    setStatusFilter("all");
    setPriorityFilter("all");
  };

  const StatCard = ({ icon: Icon, label, value, color, progress = null }) => (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -4 }}
      className={`
        relative overflow-hidden rounded-2xl border p-6 shadow-lg transition-all hover:shadow-xl
        ${isDarkMode 
          ? `bg-gradient-to-br from-${color}-500/10 to-${color}-600/5 border-slate-700/50 backdrop-blur-sm` 
          : "border-slate-200 bg-white"
        }
      `}
    >
      <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-current opacity-5" />
      <div className="relative">
        <div className={`inline-flex rounded-xl p-3 ${isDarkMode ? `bg-${color}-500/10` : `bg-${color}-50`}`}>
          <Icon className={`h-6 w-6 ${isDarkMode ? `text-${color}-400` : `text-${color}-500`}`} />
        </div>
        <p className={`mt-4 text-sm font-medium ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
          {label}
        </p>
        <p className={`mt-1 text-3xl font-bold ${isDarkMode ? `text-${color}-400` : `text-${color}-600`}`}>
          {value}
        </p>
        {progress !== null && (
          <div className="mt-4">
            <div className={`h-2 rounded-full ${isDarkMode ? "bg-slate-700" : "bg-slate-100"}`}>
              <motion.div 
                className={`h-2 rounded-full ${isDarkMode ? `bg-${color}-400` : `bg-${color}-500`}`}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <motion.div 
      className={`
        min-h-screen transition-colors duration-300 p-4 md:p-6 lg:p-8
        ${isDarkMode 
          ? "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" 
          : "bg-gradient-to-br from-slate-50 via-white to-slate-50"
        }
      `}
      initial="hidden"
      animate={isLoaded ? "visible" : "hidden"}
      variants={containerVariants}
    >
      {/* Header Section */}
      <motion.div 
        variants={itemVariants}
        className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <motion.h1 
            className={`
              text-3xl font-bold tracking-tight
              ${isDarkMode ? "text-white" : "text-slate-900"}
            `}
          >
            Task Dashboard
          </motion.h1>
          <motion.p 
            className={`mt-1 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
          >
            Manage and track your assigned tasks efficiently
          </motion.p>
        </div>
        
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => loadTasks({ showRefreshing: true })}
            disabled={isRefreshing}
            className={`
              rounded-xl p-2 transition-colors
              ${isDarkMode 
                ? "bg-slate-800 text-slate-300 hover:bg-slate-700" 
                : "bg-white text-slate-600 hover:bg-slate-100"
              }
              ${isRefreshing ? "animate-spin" : ""}
            `}
          >
            <ArrowPathIcon className="h-5 w-5" />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`
              rounded-xl p-2 transition-colors
              ${isDarkMode 
                ? "bg-slate-800 text-yellow-400 hover:bg-slate-700" 
                : "bg-white text-slate-600 hover:bg-slate-100"
              }
            `}
          >
            {isDarkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
          </motion.button>
          
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className={`
              flex items-center gap-2 rounded-xl px-4 py-2 shadow-lg
              ${isDarkMode 
                ? "bg-slate-800/90 backdrop-blur-sm border border-slate-700" 
                : "bg-white border border-slate-200"
              }
            `}
          >
            <SparklesIcon className={`h-5 w-5 ${isDarkMode ? "text-blue-400" : "text-blue-500"}`} />
            <span className={`text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
              {completionRate}% Complete
            </span>
          </motion.div>
        </div>
      </motion.div>

      {/* Attendance Section */}
      <motion.div variants={itemVariants} className="mb-8">
        <EmployeeDashboardAttendanceSection />
      </motion.div>

      {/* High Priority Alert */}
      {highPriorityTasks.length > 0 && (
        <motion.section
          variants={itemVariants}
          className="mb-8"
        >
          <div className={`
            rounded-2xl border p-6 shadow-lg
            ${isDarkMode
              ? "border-rose-500/20 bg-gradient-to-br from-rose-500/10 via-slate-900 to-orange-500/5"
              : "border-rose-200 bg-gradient-to-br from-rose-50 via-white to-orange-50"
            }
          `}>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div className={`rounded-xl p-3 ${
                  isDarkMode ? "bg-rose-500/20 text-rose-300" : "bg-rose-100 text-rose-600"
                }`}>
                  <ExclamationTriangleIcon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className={`text-lg font-semibold ${isDarkMode ? "text-rose-200" : "text-rose-700"}`}>
                    High Priority Tasks
                  </h2>
                  <p className={`text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                    {highPriorityTasks.length} urgent {highPriorityTasks.length === 1 ? "task needs" : "tasks need"} your attention
                  </p>
                </div>
              </div>
              <div className={`
                inline-flex rounded-full px-4 py-2 text-sm font-semibold
                ${isDarkMode ? "bg-rose-500/20 text-rose-200" : "bg-rose-100 text-rose-700"}
              `}>
                Action required
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {highPriorityTasks.slice(0, 4).map((task) => (
                <motion.button
                  key={task._id}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => openTaskDetails(task)}
                  className={`
                    rounded-xl border p-4 text-left transition-all
                    ${isDarkMode
                      ? "border-rose-500/20 bg-slate-900/50 hover:bg-slate-900"
                      : "border-rose-200 bg-white hover:bg-rose-50/50"
                    }
                  `}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className={`font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                      {task.title}
                    </h3>
                    <span className="text-xs">🔴</span>
                  </div>
                  <p className={`mt-2 text-sm line-clamp-2 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                    {task.description}
                  </p>
                  <div className={`mt-4 flex items-center gap-3 text-xs ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                    <span>Due: {new Date(task.taskDate).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{task.assignedBy?.name || "Unknown"}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* Stats Cards */}
      <motion.section 
        variants={itemVariants}
        className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard icon={ChartBarIcon} label="Total Tasks" value={counts.total} color="blue" />
        <StatCard icon={CheckCircleIcon} label="Completed" value={counts.completed} color="emerald" progress={completionRate} />
        <StatCard icon={ClockIcon} label="In Progress" value={counts.inProgress} color="amber" />
        <StatCard icon={CheckCircleSolid} label="Pending" value={counts.pending} color="purple" />
      </motion.section>

      {/* Tasks Section */}
      <motion.section 
        variants={itemVariants}
        className={`
          rounded-2xl border shadow-lg
          ${isDarkMode 
            ? "border-slate-700/50 bg-slate-900/40 backdrop-blur-sm" 
            : "border-slate-200 bg-white/80"
          }
        `}
      >
        {/* Tasks Header */}
        <div className="border-b border-inherit p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className={`text-xl font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-900"}`}>
              My Assigned Tasks
              {filteredTasks.length > 0 && (
                <span className={`ml-2 text-sm font-normal ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  ({filteredTasks.length} of {tasks.length})
                </span>
              )}
            </h2>
            
            <div className="flex items-center gap-3">
              {/* Search Input */}
              <div className="relative flex-1 sm:flex-none">
                <MagnifyingGlassIcon className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${
                  isDarkMode ? "text-slate-500" : "text-slate-400"
                }`} />
                <input
                  type="text"
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  placeholder="Search tasks..."
                  className={`
                    w-full rounded-xl border py-2 pl-9 pr-4 text-sm transition-all
                    focus:outline-none focus:ring-2
                    ${isDarkMode 
                      ? "border-slate-700 bg-slate-800 text-slate-200 placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20" 
                      : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-200"
                    }
                  `}
                />
              </div>

              {/* Filter Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`
                  relative rounded-xl px-4 py-2 text-sm font-medium transition-all
                  ${isDarkMode 
                    ? activeFilterCount > 0
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    : activeFilterCount > 0
                      ? "bg-blue-500 text-white"
                      : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }
                `}
              >
                <FunnelIcon className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] text-white">
                    {activeFilterCount}
                  </span>
                )}
              </motion.button>
            </div>
          </div>

          {/* Filter Panel */}
          <AnimatePresence>
            {isFilterOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-4 overflow-hidden"
              >
                <div className={`
                  rounded-xl border p-4
                  ${isDarkMode ? "border-slate-700 bg-slate-800/50" : "border-slate-200 bg-slate-50"}
                `}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className={`mb-2 block text-xs font-medium ${
                        isDarkMode ? "text-slate-400" : "text-slate-500"
                      }`}>
                        Status
                      </label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className={`
                          w-full rounded-lg border px-3 py-2 text-sm
                          focus:outline-none focus:ring-2
                          ${isDarkMode 
                            ? "border-slate-600 bg-slate-700 text-slate-200 focus:border-blue-500 focus:ring-blue-500/20" 
                            : "border-slate-300 bg-white text-slate-700 focus:border-blue-500 focus:ring-blue-200"
                          }
                        `}
                      >
                        <option value="all">All Statuses</option>
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {formatStatusLabel(status)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={`mb-2 block text-xs font-medium ${
                        isDarkMode ? "text-slate-400" : "text-slate-500"
                      }`}>
                        Priority
                      </label>
                      <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className={`
                          w-full rounded-lg border px-3 py-2 text-sm
                          focus:outline-none focus:ring-2
                          ${isDarkMode 
                            ? "border-slate-600 bg-slate-700 text-slate-200 focus:border-blue-500 focus:ring-blue-500/20" 
                            : "border-slate-300 bg-white text-slate-700 focus:border-blue-500 focus:ring-blue-200"
                          }
                        `}
                      >
                        <option value="all">All Priorities</option>
                        {PRIORITY_OPTIONS.map((priority) => (
                          <option key={priority} value={priority}>
                            {formatStatusLabel(priority)} {PRIORITY_ICONS[priority]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {activeFilterCount > 0 && (
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={resetFilters}
                        className={`
                          inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium
                          ${isDarkMode 
                            ? "bg-slate-700 text-slate-300 hover:bg-slate-600" 
                            : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                          }
                        `}
                      >
                        <XMarkIcon className="h-3 w-3" />
                        Reset Filters
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mx-6 mt-4 rounded-lg bg-rose-500/10 p-4 text-sm text-rose-400 border border-rose-500/20"
          >
            {error}
          </motion.div>
        )}

        {/* Tasks Content */}
        <div className="p-6">
          {filteredTasks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <div className={`
                mb-4 rounded-full p-4
                ${isDarkMode ? "bg-slate-800" : "bg-slate-100"}
              `}>
                <CheckCircleIcon className={`h-8 w-8 ${isDarkMode ? "text-slate-600" : "text-slate-400"}`} />
              </div>
              <h3 className={`text-lg font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-900"}`}>
                No tasks found
              </h3>
              <p className={`mt-1 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                {activeFilterCount > 0 
                  ? "Try adjusting your filters"
                  : "You don't have any assigned tasks yet"}
              </p>
              {activeFilterCount > 0 && (
                <button
                  onClick={resetFilters}
                  className={`
                    mt-4 rounded-lg px-4 py-2 text-sm font-medium
                    ${isDarkMode 
                      ? "bg-blue-600 text-white hover:bg-blue-700" 
                      : "bg-blue-500 text-white hover:bg-blue-600"
                    }
                  `}
                >
                  Clear Filters
                </button>
              )}
            </motion.div>
          ) : (
            <div className="space-y-4">
              {/* Mobile View */}
              <div className="space-y-3 lg:hidden">
                <AnimatePresence mode="popLayout">
                  {filteredTasks.map((task, index) => (
                    <motion.div
                      key={task._id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.05 }}
                      className={`
                        group relative overflow-hidden rounded-xl border p-4
                        ${isDarkMode 
                          ? "border-slate-700 bg-slate-800/50" 
                          : "border-slate-200 bg-white"
                        }
                        ${task.priority === "high" && `
                          ${isDarkMode 
                            ? "before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-rose-500" 
                            : "before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-rose-400"
                          }
                        `}
                      `}
                    >
                      <div className="flex items-start justify-between">
                        <button
                          onClick={() => openTaskDetails(task)}
                          className="flex-1 text-left"
                        >
                          <h3 className={`font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-900"}`}>
                            {task.title}
                          </h3>
                          <p className={`mt-1 text-sm line-clamp-2 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                            {task.description}
                          </p>
                        </button>
                        <span className={`
                          ml-2 rounded-full px-2 py-1 text-xs font-medium
                          ${PRIORITY_STYLES[task.priority]}
                        `}>
                          {PRIORITY_ICONS[task.priority]} {task.priority}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center gap-2 text-xs">
                        <span className={`flex items-center gap-1 ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                          <span>👤</span> {task.assignedBy?.name || "Unknown"}
                        </span>
                        <span className={`flex items-center gap-1 ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                          <span>📅</span> {new Date(task.taskDate).toLocaleDateString()}
                        </span>
                      </div>

                      {shouldShowTaskProgress(task) && (
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className={isDarkMode ? "text-slate-400" : "text-slate-600"}>Progress</span>
                            <span className={`font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                              {getTaskProgressPercent(task, now)}%
                            </span>
                          </div>
                          <div className={`h-1.5 rounded-full ${isDarkMode ? "bg-slate-700" : "bg-slate-200"}`}>
                            <div
                              className={`h-1.5 rounded-full bg-gradient-to-r ${getTaskProgressClasses(task, now)}`}
                              style={{ width: `${getTaskProgressPercent(task, now)}%` }}
                            />
                          </div>
                          <p className={`mt-1 text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                            {getTaskTimingText(task, now)}
                          </p>
                        </div>
                      )}

                      <div className="mt-4 flex items-center gap-2">
                        <select
                          value={selectedStatus[task._id] || task.status}
                          onChange={(e) =>
                            setSelectedStatus((prev) => ({
                              ...prev,
                              [task._id]: e.target.value,
                            }))
                          }
                          className={`
                            flex-1 rounded-lg border px-3 py-2 text-sm
                            focus:outline-none focus:ring-2
                            ${isDarkMode 
                              ? "border-slate-600 bg-slate-700 text-slate-200 focus:border-blue-500 focus:ring-blue-500/20" 
                              : "border-slate-300 bg-white text-slate-700 focus:border-blue-500 focus:ring-blue-200"
                            }
                          `}
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {formatStatusLabel(status)}
                            </option>
                          ))}
                        </select>

                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => updateTask(task._id)}
                          disabled={savingTaskId === task._id}
                          className={`
                            rounded-lg px-4 py-2 text-sm font-medium text-white
                            transition-all disabled:opacity-50
                            ${isDarkMode 
                              ? "bg-blue-600 hover:bg-blue-700" 
                              : "bg-blue-500 hover:bg-blue-600"
                            }
                          `}
                        >
                          {savingTaskId === task._id ? (
                            <ArrowPathIcon className="h-4 w-4 animate-spin" />
                          ) : (
                            "Save"
                          )}
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Desktop Table View */}
              <div className={`hidden overflow-hidden rounded-xl border lg:block ${
                isDarkMode ? "border-slate-700" : "border-slate-200"
              }`}>
                <table className="w-full">
                  <thead className={isDarkMode ? "bg-slate-800/50" : "bg-slate-50"}>
                    <tr>
                      {["Task", "Assigned By", "Due Date", "Priority", "Status", "Actions"].map((header) => (
                        <th key={header} className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wider ${
                          isDarkMode ? "text-slate-400" : "text-slate-500"
                        }`}>
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? "divide-slate-700" : "divide-slate-200"}`}>
                    <AnimatePresence>
                      {filteredTasks.map((task, index) => (
                        <motion.tr
                          key={task._id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className={`
                            group transition-colors
                            ${isDarkMode ? "hover:bg-slate-800/50" : "hover:bg-slate-50"}
                            ${task.priority === "high" && `
                              ${isDarkMode 
                                ? "border-l-4 border-l-rose-500" 
                                : "border-l-4 border-l-rose-400"
                              }
                            `}
                          `}
                        >
                          <td className="px-6 py-4">
                            <div>
                              <button
                                onClick={() => openTaskDetails(task)}
                                className={`font-medium hover:underline ${
                                  isDarkMode ? "text-slate-200" : "text-slate-900"
                                }`}
                              >
                                {task.title}
                              </button>
                              <p className={`mt-1 text-sm line-clamp-2 max-w-md ${
                                isDarkMode ? "text-slate-400" : "text-slate-600"
                              }`}>
                                {task.description}
                              </p>
                              {shouldShowTaskProgress(task) && (
                                <div className="mt-3 max-w-xs">
                                  <div className="flex items-center justify-between text-xs mb-1">
                                    <span className={isDarkMode ? "text-slate-400" : "text-slate-600"}>Progress</span>
                                    <span className={`font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                                      {getTaskProgressPercent(task, now)}%
                                    </span>
                                  </div>
                                  <div className={`h-1.5 rounded-full ${isDarkMode ? "bg-slate-700" : "bg-slate-200"}`}>
                                    <div
                                      className={`h-1.5 rounded-full bg-gradient-to-r ${getTaskProgressClasses(task, now)}`}
                                      style={{ width: `${getTaskProgressPercent(task, now)}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className={`px-6 py-4 text-sm ${
                            isDarkMode ? "text-slate-400" : "text-slate-600"
                          }`}>
                            {task.assignedBy?.name || "Unknown"}
                          </td>
                          <td className={`px-6 py-4 text-sm ${
                            isDarkMode ? "text-slate-400" : "text-slate-600"
                          }`}>
                            {new Date(task.taskDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`
                              inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium
                              ${PRIORITY_STYLES[task.priority]}
                            `}>
                              {PRIORITY_ICONS[task.priority]} {task.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`
                              inline-flex rounded-full px-2 py-1 text-xs font-medium
                              ${STATUS_STYLES[task.status]}
                            `}>
                              {formatStatusLabel(task.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <select
                                value={selectedStatus[task._id] || task.status}
                                onChange={(e) =>
                                  setSelectedStatus((prev) => ({
                                    ...prev,
                                    [task._id]: e.target.value,
                                  }))
                                }
                                className={`
                                  rounded-lg border px-2 py-1.5 text-sm
                                  focus:outline-none focus:ring-2
                                  ${isDarkMode 
                                    ? "border-slate-600 bg-slate-700 text-slate-200 focus:border-blue-500 focus:ring-blue-500/20" 
                                    : "border-slate-300 bg-white text-slate-700 focus:border-blue-500 focus:ring-blue-200"
                                  }
                                `}
                              >
                                {STATUS_OPTIONS.map((status) => (
                                  <option key={status} value={status}>
                                    {formatStatusLabel(status)}
                                  </option>
                                ))}
                              </select>

                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => updateTask(task._id)}
                                disabled={savingTaskId === task._id}
                                className={`
                                  rounded-lg px-3 py-1.5 text-xs font-medium text-white
                                  transition-all disabled:opacity-50
                                  ${isDarkMode 
                                    ? "bg-blue-600 hover:bg-blue-700" 
                                    : "bg-blue-500 hover:bg-blue-600"
                                  }
                                `}
                              >
                                {savingTaskId === task._id ? (
                                  <ArrowPathIcon className="h-3 w-3 animate-spin" />
                                ) : (
                                  "Save"
                                )}
                              </motion.button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </motion.section>

      <TaskDetailsModal
        task={selectedTask}
        isDarkMode={isDarkMode}
        onClose={closeTaskDetails}
        onTaskUpdated={handleTaskUpdated}
      />
    </motion.div>
  );
}