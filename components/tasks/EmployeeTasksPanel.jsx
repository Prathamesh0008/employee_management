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
} from "@heroicons/react/24/outline";

const STATUS_OPTIONS = ["pending", "in-progress", "completed"];
const PRIORITY_OPTIONS = ["low", "medium", "high"];
const AUTO_REFRESH_MS = 5000;

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

const cardVariants = {
  hidden: { scale: 0.9, opacity: 0 },
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
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25,
    },
  },
  tap: { scale: 0.98 },
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
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [now, setNow] = useState(0);

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

  const counts = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((task) => task.status === "completed").length;
    const pending = tasks.filter((task) => task.status !== "completed").length;

    return { total, completed, pending };
  }, [tasks]);

  const completionRate = useMemo(() => {
    return counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0;
  }, [counts]);

  const highPriorityTasks = useMemo(() => {
    return tasks.filter((task) => task.priority === "high" && task.status !== "completed");
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const searchValue = taskSearch.trim().toLowerCase();

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
  }, [priorityFilter, statusFilter, taskSearch, tasks]);

  const activeFilterCount = useMemo(() => {
    return [statusFilter !== "all", priorityFilter !== "all", taskSearch.trim() !== ""].filter(Boolean).length;
  }, [priorityFilter, statusFilter, taskSearch]);

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

  const getStatGradient = (color) => {
    return isDarkMode ? `from-${color}-500/20 to-${color}-600/5` : '';
  };

  return (
    <motion.div 
      className={`
        min-h-screen transition-colors duration-300 p-4 md:p-6 lg:p-8
        ${isDarkMode 
          ? "bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950" 
          : "bg-gradient-to-br from-slate-50 via-white to-blue-50"
        }
      `}
      initial="hidden"
      animate={isLoaded ? "visible" : "hidden"}
      variants={containerVariants}
    >
      {/* Header Section */}
      <motion.div 
        variants={itemVariants}
        className="mb-8 flex items-center justify-between"
      >
        <div>
          <motion.h1 
            className={`
              text-2xl font-bold md:text-3xl
              ${isDarkMode 
                ? "bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent" 
                : "bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent"
              }
            `}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Task Dashboard
          </motion.h1>
          <motion.p 
            className={`mt-1 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Manage and track your assigned tasks efficiently
          </motion.p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`
              rounded-full p-2 transition-colors
              ${isDarkMode 
                ? "bg-slate-800 text-yellow-400 hover:bg-slate-700" 
                : "bg-white text-slate-700 hover:bg-slate-100"
              }
            `}
          >
            {isDarkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
          </motion.button>
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              flex items-center gap-2 rounded-full px-4 py-2 shadow-lg
              ${isDarkMode 
                ? "bg-slate-800/90 backdrop-blur-sm border border-slate-700" 
                : "bg-white"
              }
            `}
          >
            <SparklesIcon className={`h-5 w-5 ${isDarkMode ? "text-blue-400" : "text-blue-500"}`} />
            <span className={`text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
              Performance: {completionRate}%
            </span>
          </motion.div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="mb-8">
        <EmployeeDashboardAttendanceSection />
      </motion.div>

      {highPriorityTasks.length > 0 ? (
        <motion.section
          variants={itemVariants}
          className={`mb-8 rounded-3xl border p-5 shadow-lg ${
            isDarkMode
              ? "border-rose-500/20 bg-gradient-to-br from-rose-500/15 via-slate-900/80 to-orange-500/10"
              : "border-rose-200 bg-gradient-to-br from-rose-50 via-white to-orange-50"
          }`}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className={`rounded-2xl p-3 ${
                isDarkMode ? "bg-rose-500/15 text-rose-300" : "bg-rose-100 text-rose-600"
              }`}>
                <ExclamationTriangleIcon className="h-6 w-6" />
              </div>
              <div>
                <h2 className={`text-xl font-semibold ${isDarkMode ? "text-rose-200" : "text-rose-700"}`}>
                  High Priority Focus
                </h2>
                <p className={`text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                  {highPriorityTasks.length} urgent {highPriorityTasks.length === 1 ? "task needs" : "tasks need"} attention.
                </p>
              </div>
            </div>
            <div className={`rounded-full px-4 py-2 text-sm font-semibold ${
              isDarkMode ? "bg-rose-500/15 text-rose-200" : "bg-rose-100 text-rose-700"
            }`}>
              Immediate action recommended
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {highPriorityTasks.slice(0, 4).map((task) => (
              <button
                key={task._id}
                type="button"
                onClick={() => openTaskDetails(task)}
                className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${
                  isDarkMode
                    ? "border-rose-500/20 bg-slate-950/60 hover:bg-slate-900"
                    : "border-rose-200 bg-white hover:bg-rose-50/60"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`text-base font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                      {task.title}
                    </p>
                    <p className={`mt-1 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                      {truncateWords(task.description, 10, 90)}
                    </p>
                  </div>
                  <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-1 text-xs font-semibold text-rose-400">
                    Urgent
                  </span>
                </div>

                <div className={`mt-4 flex flex-wrap items-center gap-3 text-xs ${
                  isDarkMode ? "text-slate-400" : "text-slate-500"
                }`}>
                  <span>Due: {new Date(task.taskDate).toLocaleDateString()}</span>
                  <span>Status: {formatStatusLabel(task.status)}</span>
                  <span>Assigned by: {task.assignedBy?.name || "Unknown"}</span>
                </div>
              </button>
            ))}
          </div>
        </motion.section>
      ) : null}

      {/* Stats Cards */}
      <motion.section 
        variants={itemVariants}
        className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <motion.div
          variants={cardVariants}
          whileHover="hover"
          whileTap="tap"
          className={`
            group relative overflow-hidden rounded-2xl border p-6 shadow-lg transition-all hover:shadow-xl
            ${isDarkMode 
              ? "bg-gradient-to-br from-blue-500/20 to-blue-600/5 border-slate-700/50 backdrop-blur-sm" 
              : "border-slate-200 bg-white"
            }
          `}
        >
          <div className={`
            absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full transition-transform group-hover:scale-150
            ${isDarkMode ? "bg-blue-500/20" : "bg-blue-50"}
          `} />
          <ChartBarIcon className={`relative h-8 w-8 ${isDarkMode ? "text-blue-400" : "text-blue-500"}`} />
          <p className={`relative mt-4 text-sm font-medium ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
            Total Tasks
          </p>
          <p className={`relative mt-1 text-3xl font-bold ${isDarkMode ? "text-blue-400" : "text-slate-900"}`}>
            {counts.total}
          </p>
          <div className={`relative mt-2 h-1.5 w-full rounded-full ${isDarkMode ? "bg-slate-700" : "bg-slate-100"}`}>
            <motion.div 
              className={`h-1.5 rounded-full ${isDarkMode ? "bg-blue-400" : "bg-blue-500"}`}
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 1, delay: 0.5 }}
            />
          </div>
        </motion.div>

        <motion.div
          variants={cardVariants}
          whileHover="hover"
          whileTap="tap"
          className={`
            group relative overflow-hidden rounded-2xl border p-6 shadow-lg transition-all hover:shadow-xl
            ${isDarkMode 
              ? "bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 border-slate-700/50 backdrop-blur-sm" 
              : "border-slate-200 bg-white"
            }
          `}
        >
          <div className={`
            absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full transition-transform group-hover:scale-150
            ${isDarkMode ? "bg-emerald-500/20" : "bg-emerald-50"}
          `} />
          <CheckCircleIcon className={`relative h-8 w-8 ${isDarkMode ? "text-emerald-400" : "text-emerald-500"}`} />
          <p className={`relative mt-4 text-sm font-medium ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
            Completed
          </p>
          <p className={`relative mt-1 text-3xl font-bold ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`}>
            {counts.completed}
          </p>
          <div className={`relative mt-2 h-1.5 w-full rounded-full ${isDarkMode ? "bg-slate-700" : "bg-slate-100"}`}>
            <motion.div 
              className={`h-1.5 rounded-full ${isDarkMode ? "bg-emerald-400" : "bg-emerald-500"}`}
              initial={{ width: 0 }}
              animate={{ width: `${(counts.completed / counts.total) * 100}%` }}
              transition={{ duration: 1, delay: 0.5 }}
            />
          </div>
        </motion.div>

        <motion.div
          variants={cardVariants}
          whileHover="hover"
          whileTap="tap"
          className={`
            group relative overflow-hidden rounded-2xl border p-6 shadow-lg transition-all hover:shadow-xl
            ${isDarkMode 
              ? "bg-gradient-to-br from-amber-500/20 to-amber-600/5 border-slate-700/50 backdrop-blur-sm" 
              : "border-slate-200 bg-white"
            }
          `}
        >
          <div className={`
            absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full transition-transform group-hover:scale-150
            ${isDarkMode ? "bg-amber-500/20" : "bg-amber-50"}
          `} />
          <ClockIcon className={`relative h-8 w-8 ${isDarkMode ? "text-amber-400" : "text-amber-500"}`} />
          <p className={`relative mt-4 text-sm font-medium ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
            In Progress
          </p>
          <p className={`relative mt-1 text-3xl font-bold ${isDarkMode ? "text-amber-400" : "text-amber-600"}`}>
            {counts.pending}
          </p>
          <div className={`relative mt-2 h-1.5 w-full rounded-full ${isDarkMode ? "bg-slate-700" : "bg-slate-100"}`}>
            <motion.div 
              className={`h-1.5 rounded-full ${isDarkMode ? "bg-amber-400" : "bg-amber-500"}`}
              initial={{ width: 0 }}
              animate={{ width: `${(counts.pending / counts.total) * 100}%` }}
              transition={{ duration: 1, delay: 0.5 }}
            />
          </div>
        </motion.div>

        <motion.div
          variants={cardVariants}
          whileHover="hover"
          whileTap="tap"
          className={`
            group relative overflow-hidden rounded-2xl border p-6 shadow-lg transition-all hover:shadow-xl
            ${isDarkMode 
              ? "bg-gradient-to-br from-purple-500/20 to-purple-600/5 border-slate-700/50 backdrop-blur-sm" 
              : "border-slate-200 bg-white"
            }
          `}
        >
          <div className={`
            absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full transition-transform group-hover:scale-150
            ${isDarkMode ? "bg-purple-500/20" : "bg-purple-50"}
          `} />
          <svg className={`relative h-8 w-8 ${isDarkMode ? "text-purple-400" : "text-purple-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <p className={`relative mt-4 text-sm font-medium ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
            Completion Rate
          </p>
          <p className={`relative mt-1 text-3xl font-bold ${isDarkMode ? "text-purple-400" : "text-purple-600"}`}>
            {completionRate}%
          </p>
          <div className={`relative mt-2 h-1.5 w-full rounded-full ${isDarkMode ? "bg-slate-700" : "bg-slate-100"}`}>
            <motion.div 
              className={`h-1.5 rounded-full ${isDarkMode ? "bg-purple-400" : "bg-purple-500"}`}
              initial={{ width: 0 }}
              animate={{ width: `${completionRate}%` }}
              transition={{ duration: 1, delay: 0.5 }}
            />
          </div>
        </motion.div>
      </motion.section>

      {/* Tasks Section */}
      <motion.section 
        variants={itemVariants}
        className={`
          rounded-2xl border p-6 shadow-lg backdrop-blur-sm
          ${isDarkMode 
            ? "border-slate-700/50 bg-slate-900/40" 
            : "border-slate-200 bg-white/80"
          }
        `}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className={`text-xl font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-900"}`}>
            My Assigned Tasks
          </h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsFilterOpen((prev) => !prev)}
            className={`
              rounded-lg px-4 py-2 text-sm font-medium text-white shadow-lg transition-all
              ${isDarkMode 
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" 
                : "bg-blue-500 hover:bg-blue-600"
              }
            `}
          >
            {activeFilterCount > 0 ? `Filter Tasks (${activeFilterCount})` : "Filter Tasks"}
          </motion.button>
        </div>

        <AnimatePresence>
          {isFilterOpen ? (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className={`mb-6 rounded-2xl border p-4 shadow-lg ${
                isDarkMode
                  ? "border-slate-700 bg-slate-800/60 backdrop-blur-sm"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="grid gap-3 md:grid-cols-4">
                <div className="md:col-span-2">
                  <label className={`mb-1 block text-xs font-semibold uppercase tracking-wide ${
                    isDarkMode ? "text-slate-400" : "text-slate-500"
                  }`}>
                    Search
                  </label>
                  <input
                    type="text"
                    value={taskSearch}
                    onChange={(event) => setTaskSearch(event.target.value)}
                    placeholder="Search by title, description, or assigned by"
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                      isDarkMode
                        ? "border-slate-600 bg-slate-700 text-slate-200 placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/20"
                        : "border-slate-300 bg-white text-slate-700 focus:border-blue-500 focus:ring-blue-200"
                    }`}
                  />
                </div>

                <div>
                  <label className={`mb-1 block text-xs font-semibold uppercase tracking-wide ${
                    isDarkMode ? "text-slate-400" : "text-slate-500"
                  }`}>
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                      isDarkMode
                        ? "border-slate-600 bg-slate-700 text-slate-200 focus:border-blue-400 focus:ring-blue-400/20"
                        : "border-slate-300 bg-white text-slate-700 focus:border-blue-500 focus:ring-blue-200"
                    }`}
                  >
                    <option value="all">All statuses</option>
                    {STATUS_OPTIONS.map((statusOption) => (
                      <option key={statusOption} value={statusOption}>
                        {formatStatusLabel(statusOption)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`mb-1 block text-xs font-semibold uppercase tracking-wide ${
                    isDarkMode ? "text-slate-400" : "text-slate-500"
                  }`}>
                    Priority
                  </label>
                  <select
                    value={priorityFilter}
                    onChange={(event) => setPriorityFilter(event.target.value)}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                      isDarkMode
                        ? "border-slate-600 bg-slate-700 text-slate-200 focus:border-blue-400 focus:ring-blue-400/20"
                        : "border-slate-300 bg-white text-slate-700 focus:border-blue-500 focus:ring-blue-200"
                    }`}
                  >
                    <option value="all">All priorities</option>
                    {PRIORITY_OPTIONS.map((priorityOption) => (
                      <option key={priorityOption} value={priorityOption}>
                        {formatStatusLabel(priorityOption)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  Showing {filteredTasks.length} of {tasks.length} tasks
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setTaskSearch("");
                    setStatusFilter("all");
                    setPriorityFilter("all");
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isDarkMode
                      ? "bg-slate-700 text-slate-200 hover:bg-slate-600"
                      : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  Reset Filters
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-lg bg-rose-500/10 p-4 text-sm text-rose-400 border border-rose-500/20"
          >
            {error}
          </motion.div>
        )}

        {/* Mobile View */}
        <div className="space-y-3 lg:hidden">
          <AnimatePresence mode="popLayout">
            {filteredTasks.map((task, index) => (
              <motion.div
                key={task._id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.1 }}
                className={`
                  group rounded-xl border p-4 shadow-lg transition-all hover:shadow-xl
                  ${isDarkMode 
                    ? "border-slate-700 bg-slate-800/50 backdrop-blur-sm hover:bg-slate-800" 
                    : "border-slate-200 bg-white"
                  }
                  ${task.priority === "high"
                    ? isDarkMode
                      ? "ring-1 ring-rose-500/30"
                      : "ring-1 ring-rose-200"
                    : ""
                  }
                `}
              >
                <div className="flex items-start justify-between">
                  <button
                    type="button"
                    onClick={() => openTaskDetails(task)}
                    className={`
                      text-left font-semibold
                      ${isDarkMode 
                        ? "text-slate-200 hover:text-blue-400" 
                        : "text-slate-900 hover:text-blue-600"
                      }
                    `}
                  >
                    {task.title}
                  </button>
                  <motion.span
                    whileHover={{ scale: 1.1 }}
                    className={`rounded-full border px-2 py-1 text-xs font-medium ${
                      PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium
                    }`}
                  >
                    {task.priority === "high" ? "high priority" : task.priority}
                  </motion.span>
                </div>
                
                <p className={`mt-1 text-sm leading-relaxed ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  {truncateWords(task.description, 2)}
                </p>

                <button
                  type="button"
                  onClick={() => openTaskDetails(task)}
                  className={`
                    mt-2 inline-flex items-center gap-1 text-xs font-medium
                    ${isDarkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"}
                  `}
                >
                  <EyeIcon className="h-3.5 w-3.5" />
                  View details
                </button>
                
                <div className={`mt-3 flex items-center gap-2 text-xs ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                  <span className="flex items-center gap-1">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {task.assignedBy?.name || "Unknown"}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {new Date(task.taskDate).toLocaleDateString()}
                  </span>
                </div>

                {shouldShowTaskProgress(task) ? (
                  <div className={`mt-4 rounded-xl border p-3 ${
                    isDarkMode ? "border-slate-700 bg-slate-900/60" : "border-slate-200 bg-slate-50"
                  }`}>
                    <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                      <span className={isDarkMode ? "font-medium text-slate-400" : "font-medium text-slate-600"}>
                        Progress
                      </span>
                      <span className={isDarkMode ? "font-semibold text-slate-200" : "font-semibold text-slate-700"}>
                        {getTaskProgressPercent(task, now)}%
                      </span>
                    </div>
                    <div className={`h-2 overflow-hidden rounded-full ${
                      isDarkMode ? "bg-slate-700" : "bg-slate-200"
                    }`}>
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${getTaskProgressClasses(task, now)}`}
                        style={{ width: `${getTaskProgressPercent(task, now)}%` }}
                      />
                    </div>
                    <p className={`mt-2 text-xs font-medium ${
                      isDarkMode ? "text-slate-400" : "text-slate-500"
                    }`}>
                      {getTaskTimingText(task, now)}
                    </p>
                  </div>
                ) : null}

                <div className="mt-4 flex items-center gap-2">
                  <div className="relative flex-1">
                    <select
                      value={selectedStatus[task._id] || task.status}
                      onChange={(event) =>
                        setSelectedStatus((prev) => ({
                          ...prev,
                          [task._id]: event.target.value,
                        }))
                      }
                      className={`
                        w-full cursor-pointer appearance-none rounded-lg border px-3 py-2 pr-8 text-sm font-medium shadow-sm focus:outline-none focus:ring-2
                        ${isDarkMode 
                          ? "border-slate-600 bg-slate-700 text-slate-200 focus:border-blue-400 focus:ring-blue-400/20" 
                          : "border-slate-300 bg-white text-slate-700 focus:border-blue-500 focus:ring-blue-200"
                        }
                      `}
                    >
                      {STATUS_OPTIONS.map((statusOption) => (
                        <option key={statusOption} value={statusOption}>
                          {formatStatusLabel(statusOption)}
                        </option>
                      ))}
                    </select>
                    <ChevronDownIcon className={`absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 ${isDarkMode ? "text-slate-400" : "text-slate-400"}`} />
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => updateTask(task._id)}
                    disabled={savingTaskId === task._id}
                    className={`
                      rounded-lg px-4 py-2 text-sm font-medium text-white shadow-lg transition-all disabled:opacity-50
                      ${isDarkMode 
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" 
                        : "bg-blue-500 hover:bg-blue-600"
                      }
                    `}
                  >
                    {savingTaskId === task._id ? (
                      <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
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
          <table className={`w-full table-fixed divide-y ${
            isDarkMode ? "divide-slate-700" : "divide-slate-200"
          }`}>
            <colgroup>
              <col className="w-[32%]" />
              <col className="w-[18%]" />
              <col className="w-[12%]" />
              <col className="w-[8%]" />
              <col className="w-[10%]" />
              <col className="w-[20%]" />
            </colgroup>
            <thead className={isDarkMode ? "bg-slate-800/50" : "bg-slate-50"}>
              <tr>
                {["Task", "Assigned By", "Date", "Priority", "Status", "Actions"].map((header) => (
                  <th key={header} className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? "text-slate-400" : "text-slate-500"
                  }`}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${
              isDarkMode ? "divide-slate-700 bg-slate-900/30" : "divide-slate-200 bg-white"
            }`}>
              <AnimatePresence>
                {filteredTasks.map((task, index) => (
                  <motion.tr
                    key={task._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className={`group transition-colors ${
                      isDarkMode ? "hover:bg-slate-800/50" : "hover:bg-slate-50"
                    }`}
                    style={
                      task.priority === "high"
                        ? {
                            boxShadow: isDarkMode
                              ? "inset 3px 0 0 rgba(251, 113, 133, 0.7)"
                              : "inset 3px 0 0 rgba(244, 63, 94, 0.45)",
                          }
                        : undefined
                    }
                  >
                    <td className="px-6 py-4">
                      <div>
                        <button
                          type="button"
                          onClick={() => openTaskDetails(task)}
                          className={`text-left font-medium ${
                            isDarkMode ? "text-slate-200 hover:text-blue-400" : "text-slate-900 hover:text-blue-600"
                          }`}
                        >
                          {task.title}
                        </button>
                        <p
                          title={task.description}
                          className={`mt-1 max-w-[230px] truncate text-sm ${
                            isDarkMode ? "text-slate-400" : "text-slate-600"
                          }`}
                        >
                          {truncateWords(task.description, 2)}
                        </p>
                        <button
                          type="button"
                          onClick={() => openTaskDetails(task)}
                          className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${
                            isDarkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"
                          }`}
                        >
                          <EyeIcon className="h-3.5 w-3.5" />
                          View details
                        </button>
                        {shouldShowTaskProgress(task) ? (
                          <div className={`mt-3 max-w-[260px] rounded-xl border p-3 ${
                            isDarkMode ? "border-slate-700 bg-slate-900/60" : "border-slate-200 bg-slate-50"
                          }`}>
                            <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                              <span className={isDarkMode ? "font-medium text-slate-400" : "font-medium text-slate-600"}>
                                Progress
                              </span>
                              <span className={isDarkMode ? "font-semibold text-slate-200" : "font-semibold text-slate-700"}>
                                {getTaskProgressPercent(task, now)}%
                              </span>
                            </div>
                            <div className={`h-2 overflow-hidden rounded-full ${
                              isDarkMode ? "bg-slate-700" : "bg-slate-200"
                            }`}>
                              <div
                                className={`h-full rounded-full bg-gradient-to-r ${getTaskProgressClasses(task, now)}`}
                                style={{ width: `${getTaskProgressPercent(task, now)}%` }}
                              />
                            </div>
                            <p className={`mt-2 text-xs font-medium ${
                              isDarkMode ? "text-slate-400" : "text-slate-500"
                            }`}>
                              {getTaskTimingText(task, now)}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </td>
                    <td className={`px-6 py-4 text-sm ${
                      isDarkMode ? "text-slate-400" : "text-slate-600"
                    }`}>
                      <p className="truncate">{task.assignedBy?.name || "Unknown"}</p>
                    </td>
                    <td className={`px-6 py-4 text-sm ${
                      isDarkMode ? "text-slate-400" : "text-slate-600"
                    }`}>
                      <p className="truncate">{new Date(task.taskDate).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <motion.span
                        whileHover={{ scale: 1.05 }}
                        className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${
                          PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium
                        }`}
                      >
                        {task.priority === "high" ? "high priority" : task.priority}
                      </motion.span>
                    </td>
                    <td className="px-6 py-4">
                      <motion.span
                        whileHover={{ scale: 1.05 }}
                        className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${
                          STATUS_STYLES[task.status] || STATUS_STYLES.pending
                        }`}
                      >
                        {formatStatusLabel(task.status)}
                      </motion.span>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="relative">
                          <select
                            value={selectedStatus[task._id] || task.status}
                            onChange={(event) =>
                              setSelectedStatus((prev) => ({
                                ...prev,
                                [task._id]: event.target.value,
                              }))
                            }
                            className={`w-30 cursor-pointer appearance-none rounded-lg border px-2.5 py-2 pr-7 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 ${
                              isDarkMode 
                                ? "border-slate-600 bg-slate-700 text-slate-200 focus:border-blue-400 focus:ring-blue-400/20" 
                                : "border-slate-300 bg-white text-slate-700 focus:border-blue-500 focus:ring-blue-200"
                            }`}
                          >
                            {STATUS_OPTIONS.map((statusOption) => (
                              <option key={statusOption} value={statusOption}>
                                {formatStatusLabel(statusOption)}
                              </option>
                            ))}
                          </select>
                          <ChevronDownIcon className={`absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 ${
                            isDarkMode ? "text-slate-400" : "text-slate-400"
                          }`} />
                        </div>

                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() => updateTask(task._id)}
                          disabled={savingTaskId === task._id}
                          className={`shrink-0 rounded-lg px-2.5 py-2 text-xs font-semibold text-white shadow-lg transition-all disabled:opacity-50 ${
                            isDarkMode 
                              ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" 
                              : "bg-blue-500 hover:bg-blue-600"
                          }`}
                        >
                          {savingTaskId === task._id ? (
                            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
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

        {filteredTasks.length === 0 ? (
          <div className={`mt-6 rounded-2xl border border-dashed p-8 text-center ${
            isDarkMode ? "border-slate-700 bg-slate-800/30" : "border-slate-300 bg-slate-50"
          }`}>
            <p className={`text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
              No tasks match the current filters
            </p>
            <p className={`mt-1 text-xs ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
              Try changing the search, status, or priority filter.
            </p>
          </div>
        ) : null}
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
