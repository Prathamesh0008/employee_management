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
  CalendarIcon,
  UserIcon,
  TagIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";

const STATUS_OPTIONS = ["pending", "in-progress", "completed"];
const PRIORITY_OPTIONS = ["low", "medium", "high"];
const AUTO_REFRESH_MS = 5000;

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    color: "amber",
    bgLight: "bg-amber-50",
    bgDark: "bg-amber-500/10",
    textLight: "text-amber-700",
    textDark: "text-amber-400",
    borderLight: "border-amber-200",
    borderDark: "border-amber-500/20",
    icon: ClockIcon,
  },
  "in-progress": {
    label: "In Progress",
    color: "blue",
    bgLight: "bg-blue-50",
    bgDark: "bg-blue-500/10",
    textLight: "text-blue-700",
    textDark: "text-blue-400",
    borderLight: "border-blue-200",
    borderDark: "border-blue-500/20",
    icon: ArrowPathIcon,
  },
  completed: {
    label: "Completed",
    color: "emerald",
    bgLight: "bg-emerald-50",
    bgDark: "bg-emerald-500/10",
    textLight: "text-emerald-700",
    textDark: "text-emerald-400",
    borderLight: "border-emerald-200",
    borderDark: "border-emerald-500/20",
    icon: CheckCircleIcon,
  },
};

const PRIORITY_CONFIG = {
  low: {
    label: "Low",
    color: "emerald",
    bgLight: "bg-emerald-50",
    bgDark: "bg-emerald-500/10",
    textLight: "text-emerald-700",
    textDark: "text-emerald-400",
    borderLight: "border-emerald-200",
    borderDark: "border-emerald-500/20",
  },
  medium: {
    label: "Medium",
    color: "amber",
    bgLight: "bg-amber-50",
    bgDark: "bg-amber-500/10",
    textLight: "text-amber-700",
    textDark: "text-amber-400",
    borderLight: "border-amber-200",
    borderDark: "border-amber-500/20",
  },
  high: {
    label: "High",
    color: "rose",
    bgLight: "bg-rose-50",
    bgDark: "bg-rose-500/10",
    textLight: "text-rose-700",
    textDark: "text-rose-400",
    borderLight: "border-rose-200",
    borderDark: "border-rose-500/20",
  },
};

function formatStatusLabel(status) {
  return STATUS_CONFIG[status]?.label || status;
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

// Animation variants
const fadeInUp = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
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
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [now, setNow] = useState(0);
  const [viewMode, setViewMode] = useState("grid"); // grid or list

  const loadTasks = useCallback(async ({ silent = false } = {}) => {
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

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((task) => task.status === "completed").length;
    const inProgress = tasks.filter((task) => task.status === "in-progress").length;
    const pending = tasks.filter((task) => task.status === "pending").length;
    const highPriority = tasks.filter((task) => task.priority === "high" && task.status !== "completed").length;

    return { total, completed, inProgress, pending, highPriority };
  }, [tasks]);

  const completionRate = useMemo(() => {
    return stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  }, [stats]);

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
      const matchesSearch =
        !query ||
        [task.title, task.description, task.assignedBy?.name]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      return matchesStatus && matchesPriority && matchesSearch;
    });
  }, [priorityFilter, statusFilter, searchQuery, tasks]);

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

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setPriorityFilter("all");
  };

  const hasActiveFilters = searchQuery || statusFilter !== "all" || priorityFilter !== "all";

  return (
    <motion.div 
      className={`
        min-h-screen transition-colors duration-300
        ${isDarkMode 
          ? "bg-slate-900" 
          : "bg-slate-50"
        }
      `}
      initial="hidden"
      animate={isLoaded ? "visible" : "hidden"}
      variants={staggerContainer}
    >
      {/* Header */}
      <header className={`
        sticky top-0 z-20 border-b
        ${isDarkMode 
          ? "bg-slate-900/95 border-slate-800 backdrop-blur-sm" 
          : "bg-white/95 border-slate-200 backdrop-blur-sm"
        }
      `}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`
                p-2 rounded-xl
                ${isDarkMode ? "bg-indigo-600" : "bg-indigo-100"}
              `}>
                <CheckCircleIcon className={`h-6 w-6 ${isDarkMode ? "text-white" : "text-indigo-600"}`} />
              </div>
              <div>
                <h1 className={`text-xl font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                  Task Dashboard
                </h1>
                <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  Welcome back, John
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`
                  p-2 rounded-lg transition-colors
                  ${isDarkMode 
                    ? "bg-slate-800 text-yellow-400 hover:bg-slate-700" 
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }
                `}
              >
                {isDarkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
              </motion.button>

              {/* View Toggle */}
              <div className={`
                flex rounded-lg p-1
                ${isDarkMode ? "bg-slate-800" : "bg-slate-100"}
              `}>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`
                    px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                    ${viewMode === "grid"
                      ? isDarkMode
                        ? "bg-indigo-600 text-white"
                        : "bg-white text-indigo-600 shadow-sm"
                      : isDarkMode
                        ? "text-slate-400 hover:text-white"
                        : "text-slate-600 hover:text-slate-900"
                    }
                  `}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`
                    px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                    ${viewMode === "list"
                      ? isDarkMode
                        ? "bg-indigo-600 text-white"
                        : "bg-white text-indigo-600 shadow-sm"
                      : isDarkMode
                        ? "text-slate-400 hover:text-white"
                        : "text-slate-600 hover:text-slate-900"
                    }
                  `}
                >
                  List
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Attendance Section */}
        <motion.div variants={fadeInUp} className="mb-8">
          <EmployeeDashboardAttendanceSection />
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={fadeInUp} className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Total Tasks", value: stats.total, icon: ChartBarIcon, color: "blue" },
            { label: "Completed", value: stats.completed, icon: CheckCircleIcon, color: "emerald" },
            { label: "In Progress", value: stats.inProgress, icon: ArrowPathIcon, color: "amber" },
            { label: "Pending", value: stats.pending, icon: ClockIcon, color: "purple" },
            { label: "Completion Rate", value: `${completionRate}%`, icon: SparklesIcon, color: "indigo" },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              whileHover={{ y: -2 }}
              className={`
                rounded-xl p-4 border
                ${isDarkMode 
                  ? `bg-slate-800 border-slate-700` 
                  : "bg-white border-slate-200"
                }
              `}
            >
              <div className="flex items-center justify-between mb-2">
                <stat.icon className={`h-5 w-5 ${isDarkMode ? `text-${stat.color}-400` : `text-${stat.color}-600`}`} />
                <span className={`text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  {stat.label}
                </span>
              </div>
              <p className={`text-2xl font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                {stat.value}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* High Priority Alert */}
        {stats.highPriority > 0 && (
          <motion.div
            variants={fadeInUp}
            className={`
              mb-8 rounded-xl p-4 border
              ${isDarkMode 
                ? "bg-rose-500/10 border-rose-500/20" 
                : "bg-rose-50 border-rose-200"
              }
            `}
          >
            <div className="flex items-center gap-3">
              <div className={`
                p-2 rounded-lg
                ${isDarkMode ? "bg-rose-500/20" : "bg-rose-100"}
              `}>
                <ExclamationTriangleIcon className={`h-5 w-5 ${isDarkMode ? "text-rose-400" : "text-rose-600"}`} />
              </div>
              <div className="flex-1">
                <p className={`font-medium ${isDarkMode ? "text-rose-400" : "text-rose-700"}`}>
                  {stats.highPriority} high priority {stats.highPriority === 1 ? "task needs" : "tasks need"} your attention
                </p>
              </div>
              <button
                onClick={() => setPriorityFilter("high")}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${isDarkMode 
                    ? "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30" 
                    : "bg-rose-100 text-rose-700 hover:bg-rose-200"
                  }
                `}
              >
                View Tasks
              </button>
            </div>
          </motion.div>
        )}

        {/* Search and Filters */}
        <motion.div variants={fadeInUp} className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className={`
                absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5
                ${isDarkMode ? "text-slate-400" : "text-slate-500"}
              `} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks by title, description, or assignee..."
                className={`
                  w-full pl-10 pr-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2
                  ${isDarkMode 
                    ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 focus:border-indigo-500 focus:ring-indigo-500/20" 
                    : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-indigo-200"
                  }
                `}
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`
                px-4 py-2.5 rounded-lg border font-medium transition-colors flex items-center gap-2
                ${isDarkMode 
                  ? showFilters
                    ? "bg-indigo-600 border-indigo-500 text-white"
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                  : showFilters
                    ? "bg-indigo-600 border-indigo-500 text-white"
                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                }
              `}
            >
              <FunnelIcon className="h-5 w-5" />
              <span className="hidden sm:inline">Filters</span>
              {hasActiveFilters && (
                <span className={`
                  ml-1 px-2 py-0.5 rounded-full text-xs
                  ${isDarkMode ? "bg-white/20" : "bg-white/30"}
                `}>
                  {[statusFilter !== "all", priorityFilter !== "all", searchQuery].filter(Boolean).length}
                </span>
              )}
            </button>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className={`
                  px-4 py-2.5 rounded-lg border font-medium transition-colors flex items-center gap-2
                  ${isDarkMode 
                    ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700" 
                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                  }
                `}
              >
                <XMarkIcon className="h-5 w-5" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
          </div>

          {/* Filter Options */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`
                  mt-4 p-4 rounded-lg border
                  ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}
                `}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Status Filter */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                      Status
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className={`
                        w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2
                        ${isDarkMode 
                          ? "bg-slate-700 border-slate-600 text-white focus:border-indigo-500 focus:ring-indigo-500/20" 
                          : "bg-white border-slate-300 text-slate-900 focus:border-indigo-500 focus:ring-indigo-200"
                        }
                      `}
                    >
                      <option value="all">All Statuses</option>
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {STATUS_CONFIG[status].label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Priority Filter */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                      Priority
                    </label>
                    <select
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value)}
                      className={`
                        w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2
                        ${isDarkMode 
                          ? "bg-slate-700 border-slate-600 text-white focus:border-indigo-500 focus:ring-indigo-500/20" 
                          : "bg-white border-slate-300 text-slate-900 focus:border-indigo-500 focus:ring-indigo-200"
                        }
                      `}
                    >
                      <option value="all">All Priorities</option>
                      {PRIORITY_OPTIONS.map((priority) => (
                        <option key={priority} value={priority}>
                          {PRIORITY_CONFIG[priority].label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`
                mb-6 p-4 rounded-lg border
                ${isDarkMode ? "bg-rose-500/10 border-rose-500/20" : "bg-rose-50 border-rose-200"}
              `}
            >
              <p className={`text-sm ${isDarkMode ? "text-rose-400" : "text-rose-700"}`}>{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tasks Grid/List */}
        <motion.div variants={fadeInUp}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
              Your Tasks
              <span className={`ml-2 text-sm font-normal ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                ({filteredTasks.length} of {tasks.length})
              </span>
            </h2>
          </div>

          {filteredTasks.length === 0 ? (
            <div className={`
              text-center py-12 rounded-xl border
              ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}
            `}>
              <CheckCircleIcon className={`h-12 w-12 mx-auto mb-4 ${isDarkMode ? "text-slate-600" : "text-slate-400"}`} />
              <p className={`text-lg font-medium mb-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                No tasks found
              </p>
              <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                {hasActiveFilters ? "Try adjusting your filters" : "You don't have any tasks assigned yet"}
              </p>
            </div>
          ) : viewMode === "grid" ? (
            // Grid View
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredTasks.map((task, index) => (
                  <motion.div
                    key={task._id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                    className={`
                      group rounded-xl border overflow-hidden
                      ${isDarkMode 
                        ? "bg-slate-800 border-slate-700 hover:border-slate-600" 
                        : "bg-white border-slate-200 hover:border-slate-300"
                      }
                    `}
                  >
                    {/* Priority Indicator */}
                    <div className={`
                      h-1 w-full
                      ${task.priority === "high" ? "bg-rose-500" : 
                        task.priority === "medium" ? "bg-amber-500" : "bg-emerald-500"}
                    `} />

                    <div className="p-5">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <button
                          onClick={() => openTaskDetails(task)}
                          className="flex-1 text-left"
                        >
                          <h3 className={`
                            font-semibold mb-1 hover:underline
                            ${isDarkMode ? "text-white" : "text-slate-900"}
                          `}>
                            {task.title}
                          </h3>
                        </button>
                        <span className={`
                          px-2 py-1 rounded-md text-xs font-medium
                          ${isDarkMode 
                            ? PRIORITY_CONFIG[task.priority].bgDark + " " + PRIORITY_CONFIG[task.priority].textDark
                            : PRIORITY_CONFIG[task.priority].bgLight + " " + PRIORITY_CONFIG[task.priority].textLight
                          }
                        `}>
                          {PRIORITY_CONFIG[task.priority].label}
                        </span>
                      </div>

                      {/* Description */}
                      <p className={`text-sm mb-4 line-clamp-2 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                        {task.description || "No description"}
                      </p>

                      {/* Meta Info */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <UserIcon className={`h-4 w-4 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
                          <span className={isDarkMode ? "text-slate-300" : "text-slate-700"}>
                            {task.assignedBy?.name || "Unknown"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <CalendarIcon className={`h-4 w-4 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
                          <span className={isDarkMode ? "text-slate-300" : "text-slate-700"}>
                            {new Date(task.taskDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <TagIcon className={`h-4 w-4 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
                          <span className={`
                            px-2 py-0.5 rounded-md text-xs
                            ${isDarkMode 
                              ? STATUS_CONFIG[task.status].bgDark + " " + STATUS_CONFIG[task.status].textDark
                              : STATUS_CONFIG[task.status].bgLight + " " + STATUS_CONFIG[task.status].textLight
                            }
                          `}>
                            {STATUS_CONFIG[task.status].label}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {shouldShowTaskProgress(task) && (
                        <div className="mb-4">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className={isDarkMode ? "text-slate-400" : "text-slate-500"}>Progress</span>
                            <span className={isDarkMode ? "text-slate-300" : "text-slate-700"}>
                              {getTaskProgressPercent(task, now)}%
                            </span>
                          </div>
                          <div className={`
                            h-1.5 rounded-full overflow-hidden
                            ${isDarkMode ? "bg-slate-700" : "bg-slate-200"}
                          `}>
                            <div
                              className={`h-full rounded-full ${getTaskProgressClasses(task, now)}`}
                              style={{ width: `${getTaskProgressPercent(task, now)}%` }}
                            />
                          </div>
                          <p className={`text-xs mt-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                            {getTaskTimingText(task, now)}
                          </p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <select
                            value={selectedStatus[task._id] || task.status}
                            onChange={(e) =>
                              setSelectedStatus((prev) => ({
                                ...prev,
                                [task._id]: e.target.value,
                              }))
                            }
                            className={`
                              w-full px-3 py-2 pr-8 rounded-lg border text-sm appearance-none focus:outline-none focus:ring-2
                              ${isDarkMode 
                                ? "bg-slate-700 border-slate-600 text-white focus:border-indigo-500 focus:ring-indigo-500/20" 
                                : "bg-white border-slate-300 text-slate-900 focus:border-indigo-500 focus:ring-indigo-200"
                              }
                            `}
                          >
                            {STATUS_OPTIONS.map((status) => (
                              <option key={status} value={status}>
                                {STATUS_CONFIG[status].label}
                              </option>
                            ))}
                          </select>
                          <ChevronDownIcon className={`
                            absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none
                            ${isDarkMode ? "text-slate-400" : "text-slate-500"}
                          `} />
                        </div>

                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => updateTask(task._id)}
                          disabled={savingTaskId === task._id}
                          className={`
                            px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors
                            ${isDarkMode 
                              ? "bg-indigo-600 hover:bg-indigo-700" 
                              : "bg-indigo-600 hover:bg-indigo-700"
                            }
                            ${savingTaskId === task._id ? "opacity-50 cursor-not-allowed" : ""}
                          `}
                        >
                          {savingTaskId === task._id ? (
                            <ArrowPathIcon className="h-5 w-5 animate-spin" />
                          ) : (
                            "Save"
                          )}
                        </motion.button>
                      </div>

                      {/* View Details Link */}
                      <button
                        onClick={() => openTaskDetails(task)}
                        className={`
                          mt-3 text-sm font-medium flex items-center gap-1
                          ${isDarkMode ? "text-indigo-400 hover:text-indigo-300" : "text-indigo-600 hover:text-indigo-700"}
                        `}
                      >
                        <EyeIcon className="h-4 w-4" />
                        View Details
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            // List View
            <div className={`
              rounded-xl border overflow-hidden
              ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}
            `}>
              <table className="w-full">
                <thead className={isDarkMode ? "bg-slate-700/50" : "bg-slate-50"}>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Task</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Assignee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? "divide-slate-700" : "divide-slate-200"}`}>
                  <AnimatePresence>
                    {filteredTasks.map((task) => (
                      <motion.tr
                        key={task._id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={isDarkMode ? "hover:bg-slate-700/50" : "hover:bg-slate-50"}
                      >
                        <td className="px-6 py-4">
                          <div>
                            <button
                              onClick={() => openTaskDetails(task)}
                              className={`font-medium hover:underline ${isDarkMode ? "text-white" : "text-slate-900"}`}
                            >
                              {task.title}
                            </button>
                            <p className={`text-sm truncate max-w-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                              {task.description || "No description"}
                            </p>
                          </div>
                        </td>
                        <td className={`px-6 py-4 text-sm ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                          {task.assignedBy?.name || "Unknown"}
                        </td>
                        <td className={`px-6 py-4 text-sm ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                          {new Date(task.taskDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`
                            px-2 py-1 rounded-md text-xs font-medium
                            ${isDarkMode 
                              ? PRIORITY_CONFIG[task.priority].bgDark + " " + PRIORITY_CONFIG[task.priority].textDark
                              : PRIORITY_CONFIG[task.priority].bgLight + " " + PRIORITY_CONFIG[task.priority].textLight
                            }
                          `}>
                            {PRIORITY_CONFIG[task.priority].label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`
                            px-2 py-1 rounded-md text-xs font-medium
                            ${isDarkMode 
                              ? STATUS_CONFIG[task.status].bgDark + " " + STATUS_CONFIG[task.status].textDark
                              : STATUS_CONFIG[task.status].bgLight + " " + STATUS_CONFIG[task.status].textLight
                            }
                          `}>
                            {STATUS_CONFIG[task.status].label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <select
                              value={selectedStatus[task._id] || task.status}
                              onChange={(e) =>
                                setSelectedStatus((prev) => ({
                                  ...prev,
                                  [task._id]: e.target.value,
                                }))
                              }
                              className={`
                                px-2 py-1 rounded border text-sm
                                ${isDarkMode 
                                  ? "bg-slate-700 border-slate-600 text-white" 
                                  : "bg-white border-slate-300 text-slate-900"
                                }
                              `}
                            >
                              {STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                  {STATUS_CONFIG[status].label}
                                </option>
                              ))}
                            </select>

                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => updateTask(task._id)}
                              disabled={savingTaskId === task._id}
                              className={`
                                p-2 rounded transition-colors
                                ${isDarkMode 
                                  ? "bg-indigo-600 hover:bg-indigo-700 text-white" 
                                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
                                }
                                ${savingTaskId === task._id ? "opacity-50 cursor-not-allowed" : ""}
                              `}
                            >
                              {savingTaskId === task._id ? (
                                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircleIcon className="h-4 w-4" />
                              )}
                            </motion.button>

                            <button
                              onClick={() => openTaskDetails(task)}
                              className={`
                                p-2 rounded transition-colors
                                ${isDarkMode 
                                  ? "bg-slate-700 hover:bg-slate-600 text-slate-300" 
                                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                }
                              `}
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </main>

      <TaskDetailsModal
        task={selectedTask}
        isDarkMode={isDarkMode}
        onClose={closeTaskDetails}
        onTaskUpdated={handleTaskUpdated}
      />
    </motion.div>
  );
}