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
  BoltIcon,
  CpuChipIcon,
  RocketLaunchIcon,
  FireIcon,
} from "@heroicons/react/24/outline";

const STATUS_OPTIONS = ["pending", "in-progress", "completed"];
const PRIORITY_OPTIONS = ["low", "medium", "high"];
const AUTO_REFRESH_MS = 5000;

// Unique neon-inspired status styles
const STATUS_STYLES = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]",
  "in-progress": "bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.2)]",
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]",
};

// Unique neon-inspired priority styles
const PRIORITY_STYLES = {
  low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]",
  high: "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.3)]",
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

// Unique animation variants
const containerVariants = {
  hidden: { opacity: 100 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { y: 30, opacity: 0, filter: "blur(10px)" },
  visible: {
    y: 0,
    opacity: 1,
    filter: "blur(0px)",
    transition: {
      type: "spring",
      stiffness: 150,
      damping: 15,
    },
  },
};

const cardVariants = {
  hidden: { scale: 0.9, opacity: 0, rotateX: -15 },
  visible: {
    scale: 1,
    opacity: 1,
    rotateX: 0,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 20,
    },
  },
  hover: {
    scale: 1.03,
    y: -5,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25,
    },
  },
  tap: { scale: 0.97 },
};

const glowPulseVariants = {
  initial: { opacity: 0.5, scale: 1 },
  animate: {
    opacity: [0.5, 0.8, 0.5],
    scale: [1, 1.05, 1],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut",
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
  const completedProgress = counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0;
  const pendingProgress = counts.total > 0 ? Math.round((counts.pending / counts.total) * 100) : 0;

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

  return (
    <motion.div 
      className={`
        min-h-screen transition-all duration-500 p-4 md:p-6 lg:p-8
        ${isDarkMode 
          ? "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950 via-slate-950 to-purple-950" 
          : "bg-gradient-to-br from-slate-50 via-white to-blue-50"
        }
      `}
      initial="hidden"
      animate={isLoaded ? "visible" : "hidden"}
      variants={containerVariants}
    >
      {/* Animated Background Elements */}
      {isDarkMode && (
        <>
          <motion.div 
            className="fixed inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ duration: 1 }}
          >
            <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse animation-delay-2000" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-3xl" />
          </motion.div>
          
          {/* Grid Overlay */}
          <div 
            className="fixed inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: `
                linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px'
            }}
          />
        </>
      )}

      {/* Header Section */}
      <motion.div 
        variants={itemVariants}
        className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between relative z-10"
      >
        <div>
          <motion.div 
            className="flex items-center gap-3"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className={`p-2 rounded-xl ${isDarkMode ? 'bg-indigo-500/20' : 'bg-blue-100'}`}
            >
              <RocketLaunchIcon className={`h-8 w-8 ${isDarkMode ? 'text-indigo-400' : 'text-blue-600'}`} />
            </motion.div>
            <div>
              <motion.h1 
                className={`
                  text-3xl font-bold md:text-4xl
                  ${isDarkMode 
                    ? "bg-gradient-to-r from-indigo-400 via-blue-400 to-purple-400 bg-clip-text text-transparent" 
                    : "text-slate-900"
                  }
                `}
                animate={isDarkMode ? {
                  textShadow: [
                    "0 0 20px rgba(99,102,241,0.5)",
                    "0 0 40px rgba(99,102,241,0.8)",
                    "0 0 20px rgba(99,102,241,0.5)"
                  ]
                } : {}}
                transition={{ duration: 3, repeat: Infinity }}
              >
                Task Dashboard
              </motion.h1>
              <motion.p 
                className={`mt-1 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}
              >
                Manage and track your assigned tasks efficiently
              </motion.p>
            </div>
          </motion.div>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.1, rotate: 180 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300 }}
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`
              rounded-full p-3 transition-all
              ${isDarkMode 
                ? "bg-slate-800/90 text-yellow-400 hover:bg-slate-700 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.3)]" 
                : "bg-white text-slate-700 hover:bg-slate-100"
              }
            `}
          >
            {isDarkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
          </motion.button>
          <motion.div 
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className={`
              flex items-center gap-2 rounded-2xl px-5 py-2.5 shadow-lg
              ${isDarkMode 
                ? "bg-slate-800/90 backdrop-blur-sm border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.2)]" 
                : "bg-white"
              }
            `}
          >
            <CpuChipIcon className={`h-5 w-5 ${isDarkMode ? "text-indigo-400 animate-pulse" : "text-blue-500"}`} />
            <span className={`text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
              Performance: {completionRate}%
            </span>
          </motion.div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="mb-8 relative z-10">
        <EmployeeDashboardAttendanceSection />
      </motion.div>

      {highPriorityTasks.length > 0 ? (
        <motion.section
          variants={itemVariants}
          className={`
            relative mb-8 rounded-3xl border p-6 shadow-2xl overflow-hidden
            ${isDarkMode
              ? "border-rose-500/30 bg-gradient-to-br from-rose-500/20 via-slate-900/90 to-orange-500/20"
              : "border-rose-200 bg-gradient-to-br from-rose-50 via-white to-orange-50"
            }
          `}
        >
          {/* Animated background effect for urgent section */}
          {isDarkMode && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-rose-500/10 to-orange-500/10"
              animate={{
                opacity: [0.3, 0.6, 0.3],
                scale: [1, 1.02, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          )}

          <div className="relative z-10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <motion.div 
                animate={isDarkMode ? {
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0],
                } : {}}
                transition={{ duration: 2, repeat: Infinity }}
                className={`rounded-2xl p-3 ${
                  isDarkMode ? "bg-rose-500/20 text-rose-300" : "bg-rose-100 text-rose-600"
                }`}
              >
                <FireIcon className="h-6 w-6" />
              </motion.div>
              <div>
                <h2 className={`text-xl font-semibold ${isDarkMode ? "text-rose-200" : "text-rose-700"}`}>
                  🔥 High Priority Focus
                </h2>
                <p className={`text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                  {highPriorityTasks.length} urgent {highPriorityTasks.length === 1 ? "task needs" : "tasks need"} immediate attention
                </p>
              </div>
            </div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold border ${
                isDarkMode 
                  ? "bg-rose-500/20 text-rose-200 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.3)]" 
                  : "bg-rose-100 text-rose-700"
              }`}
            >
              <span className="flex items-center gap-2">
                <BoltIcon className="h-4 w-4" />
                Immediate action required
              </span>
            </motion.div>
          </div>

          <div className="relative z-10 mt-5 grid gap-4 lg:grid-cols-2">
            {highPriorityTasks.slice(0, 4).map((task) => (
              <motion.button
                key={task._id}
                type="button"
                onClick={() => openTaskDetails(task)}
                whileHover={{ y: -5, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`
                  relative rounded-2xl border p-5 text-left transition-all overflow-hidden
                  ${isDarkMode
                    ? "border-rose-500/30 bg-slate-900/90 hover:bg-slate-900 shadow-[0_0_20px_rgba(244,63,94,0.15)]"
                    : "border-rose-200 bg-white hover:bg-rose-50/60"
                  }
                `}
              >
                {isDarkMode && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-rose-500/10 to-transparent"
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  />
                )}
                
                <div className="relative z-10 flex items-start justify-between gap-3">
                  <div>
                    <p className={`text-base font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                      {task.title}
                    </p>
                    <p className={`mt-1 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                      {truncateWords(task.description, 10, 90)}
                    </p>
                  </div>
                  <motion.span
                    animate={isDarkMode ? {
                      boxShadow: [
                        "0 0 10px rgba(244,63,94,0.3)",
                        "0 0 20px rgba(244,63,94,0.5)",
                        "0 0 10px rgba(244,63,94,0.3)"
                      ]
                    } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="shrink-0 rounded-full border border-rose-500/30 bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-400"
                  >
                    Urgent
                  </motion.span>
                </div>

                <div className={`relative z-10 mt-4 flex flex-wrap items-center gap-3 text-xs ${
                  isDarkMode ? "text-slate-400" : "text-slate-500"
                }`}>
                  <span className="flex items-center gap-1">
                    <ClockIcon className="h-3 w-3" />
                    Due: {new Date(task.taskDate).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <ChartBarIcon className="h-3 w-3" />
                    Status: {formatStatusLabel(task.status)}
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.section>
      ) : null}

      {/* Stats Cards */}
      <motion.section 
        variants={itemVariants}
        className="relative z-10 mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {[
          { icon: ChartBarIcon, label: "Total Tasks", value: counts.total, color: "blue", gradient: "from-blue-600 to-indigo-600" },
          { icon: CheckCircleIcon, label: "Completed", value: counts.completed, color: "emerald", gradient: "from-emerald-500 to-teal-500" },
          { icon: ClockIcon, label: "In Progress", value: counts.pending, color: "amber", gradient: "from-amber-500 to-orange-500" },
          { icon: SparklesIcon, label: "Completion Rate", value: `${completionRate}%`, color: "purple", gradient: "from-purple-500 to-pink-500" }
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            variants={cardVariants}
            whileHover="hover"
            whileTap="tap"
            custom={index}
            className={`
              group relative overflow-hidden rounded-2xl border p-6 shadow-2xl transition-all
              ${isDarkMode 
                ? `border-${stat.color}-500/20 bg-slate-900/90 backdrop-blur-sm` 
                : "border-slate-200 bg-white"
              }
            `}
          >
            {/* Animated background gradient */}
            {isDarkMode && (
              <motion.div
                className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-10`}
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 90, 0],
                }}
                transition={{ duration: 10, repeat: Infinity }}
              />
            )}

            {/* Glowing orb */}
            <motion.div
              className={`absolute -right-10 -top-10 h-32 w-32 rounded-full bg-${stat.color}-500/20 blur-2xl`}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                delay: index * 0.5,
              }}
            />

            <stat.icon className={`relative h-8 w-8 ${isDarkMode ? `text-${stat.color}-400` : `text-${stat.color}-500`}`} />
            <p className={`relative mt-4 text-sm font-medium ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
              {stat.label}
            </p>
            <p className={`relative mt-1 text-3xl font-bold ${isDarkMode ? `text-${stat.color}-400` : `text-${stat.color}-600`}`}>
              {stat.value}
            </p>
            
            {/* Progress bar with glow effect */}
            <div className={`relative mt-4 h-2 w-full rounded-full overflow-hidden ${isDarkMode ? "bg-slate-800" : "bg-slate-100"}`}>
              <motion.div 
                className={`absolute inset-0 bg-gradient-to-r ${stat.gradient}`}
                initial={{ width: 0, opacity: 0.8 }}
                animate={{ 
                  width: index === 0 ? "100%" : index === 1 ? `${completedProgress}%` : index === 2 ? `${pendingProgress}%` : `${completionRate}%`,
                }}
                transition={{ duration: 1, delay: 0.3 + index * 0.1 }}
              />
              {isDarkMode && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
              )}
            </div>
          </motion.div>
        ))}
      </motion.section>

      {/* Tasks Section */}
      <motion.section 
        variants={itemVariants}
        className={`
          relative z-10 rounded-2xl border p-6 shadow-2xl backdrop-blur-sm
          ${isDarkMode 
            ? "border-indigo-500/20 bg-slate-900/80" 
            : "border-slate-200 bg-white/80"
          }
        `}
      >
        {/* Section header with animated border */}
        <div className="relative mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={isDarkMode ? { rotate: 360 } : {}}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className={`p-2 rounded-lg ${isDarkMode ? 'bg-indigo-500/20' : 'bg-blue-100'}`}
            >
              <BoltIcon className={`h-5 w-5 ${isDarkMode ? 'text-indigo-400' : 'text-blue-600'}`} />
            </motion.div>
            <h2 className={`text-xl font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-900"}`}>
              My Assigned Tasks
            </h2>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsFilterOpen((prev) => !prev)}
            className={`
              relative rounded-lg px-5 py-2.5 text-sm font-medium text-white shadow-lg overflow-hidden
              ${isDarkMode 
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700" 
                : "bg-blue-500 hover:bg-blue-600"
              }
            `}
          >
            {isDarkMode && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
            )}
            <span className="relative z-10">
              {activeFilterCount > 0 ? `Filter Tasks (${activeFilterCount})` : "Filter Tasks"}
            </span>
          </motion.button>
        </div>

        <AnimatePresence>
          {isFilterOpen ? (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`mb-6 rounded-2xl border p-5 shadow-lg ${
                isDarkMode
                  ? "border-indigo-500/20 bg-slate-800/90 backdrop-blur-sm"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="grid gap-3 md:grid-cols-4">
                <div className="md:col-span-2">
                  <label className={`mb-1 block text-xs font-semibold uppercase tracking-wide ${
                    isDarkMode ? "text-indigo-400" : "text-slate-500"
                  }`}>
                    Search
                  </label>
                  <input
                    type="text"
                    value={taskSearch}
                    onChange={(event) => setTaskSearch(event.target.value)}
                    placeholder="Search by title, description, or assigned by"
                    className={`
                      w-full rounded-lg border px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2
                      ${isDarkMode
                        ? "border-indigo-500/30 bg-slate-900 text-slate-200 placeholder:text-slate-500 focus:border-indigo-400 focus:ring-indigo-400/20"
                        : "border-slate-300 bg-white text-slate-700 focus:border-blue-500 focus:ring-blue-200"
                      }
                    `}
                  />
                </div>

                <div>
                  <label className={`mb-1 block text-xs font-semibold uppercase tracking-wide ${
                    isDarkMode ? "text-indigo-400" : "text-slate-500"
                  }`}>
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className={`
                      w-full rounded-lg border px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2
                      ${isDarkMode
                        ? "border-indigo-500/30 bg-slate-900 text-slate-200 focus:border-indigo-400 focus:ring-indigo-400/20"
                        : "border-slate-300 bg-white text-slate-700 focus:border-blue-500 focus:ring-blue-200"
                      }
                    `}
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
                    isDarkMode ? "text-indigo-400" : "text-slate-500"
                  }`}>
                    Priority
                  </label>
                  <select
                    value={priorityFilter}
                    onChange={(event) => setPriorityFilter(event.target.value)}
                    className={`
                      w-full rounded-lg border px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2
                      ${isDarkMode
                        ? "border-indigo-500/30 bg-slate-900 text-slate-200 focus:border-indigo-400 focus:ring-indigo-400/20"
                        : "border-slate-300 bg-white text-slate-700 focus:border-blue-500 focus:ring-blue-200"
                      }
                    `}
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
                  Showing <span className="font-semibold text-indigo-400">{filteredTasks.length}</span> of {tasks.length} tasks
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => {
                    setTaskSearch("");
                    setStatusFilter("all");
                    setPriorityFilter("all");
                  }}
                  className={`
                    rounded-lg px-4 py-2 text-sm font-medium transition-all border
                    ${isDarkMode
                      ? "border-indigo-500/30 bg-slate-800 text-slate-200 hover:bg-slate-700"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                    }
                  `}
                >
                  Reset Filters
                </motion.button>
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
                  group relative rounded-xl border p-5 shadow-xl transition-all overflow-hidden
                  ${isDarkMode 
                    ? "border-indigo-500/20 bg-slate-900/90 backdrop-blur-sm hover:bg-slate-900" 
                    : "border-slate-200 bg-white"
                  }
                  ${task.priority === "high" && isDarkMode
                    ? "shadow-[0_0_20px_rgba(244,63,94,0.2)]"
                    : ""
                  }
                `}
              >
                {isDarkMode && task.priority === "high" && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-rose-500/10 to-transparent"
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  />
                )}

                <div className="relative z-10 flex items-start justify-between">
                  <button
                    type="button"
                    onClick={() => openTaskDetails(task)}
                    className={`
                      text-left font-semibold transition-colors
                      ${isDarkMode 
                        ? "text-slate-200 hover:text-indigo-400" 
                        : "text-slate-900 hover:text-blue-600"
                      }
                    `}
                  >
                    {task.title}
                  </button>
                  <motion.span
                    whileHover={{ scale: 1.1 }}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium
                    }`}
                  >
                    {task.priority}
                  </motion.span>
                </div>
                
                <p className={`relative z-10 mt-2 text-sm leading-relaxed ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  {truncateWords(task.description, 2)}
                </p>

                <button
                  type="button"
                  onClick={() => openTaskDetails(task)}
                  className={`
                    relative z-10 mt-2 inline-flex items-center gap-1 text-xs font-medium
                    ${isDarkMode ? "text-indigo-400 hover:text-indigo-300" : "text-blue-600 hover:text-blue-700"}
                  `}
                >
                  <EyeIcon className="h-3.5 w-3.5" />
                  View details
                </button>
                
                <div className={`relative z-10 mt-3 flex items-center gap-3 text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  <span className="flex items-center gap-1">
                    <CpuChipIcon className="h-3 w-3" />
                    {task.assignedBy?.name || "Unknown"}
                  </span>
                  <span className="flex items-center gap-1">
                    <ClockIcon className="h-3 w-3" />
                    {new Date(task.taskDate).toLocaleDateString()}
                  </span>
                </div>

                {shouldShowTaskProgress(task) && (
                  <div className={`relative z-10 mt-4 rounded-xl border p-4 ${
                    isDarkMode ? "border-indigo-500/20 bg-slate-900/60" : "border-slate-200 bg-slate-50"
                  }`}>
                    <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                      <span className={isDarkMode ? "font-medium text-slate-400" : "font-medium text-slate-600"}>
                        Progress
                      </span>
                      <span className={isDarkMode ? "font-semibold text-indigo-400" : "font-semibold text-slate-700"}>
                        {getTaskProgressPercent(task, now)}%
                      </span>
                    </div>
                    <div className={`relative h-2 overflow-hidden rounded-full ${
                      isDarkMode ? "bg-slate-800" : "bg-slate-200"
                    }`}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${getTaskProgressPercent(task, now)}%` }}
                        transition={{ duration: 1 }}
                        className={`absolute inset-0 bg-gradient-to-r ${getTaskProgressClasses(task, now)}`}
                      />
                      {isDarkMode && (
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                          animate={{ x: ['-100%', '200%'] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        />
                      )}
                    </div>
                    <p className={`mt-2 text-xs font-medium ${
                      isDarkMode ? "text-slate-400" : "text-slate-500"
                    }`}>
                      {getTaskTimingText(task, now)}
                    </p>
                  </div>
                )}

                <div className="relative z-10 mt-4 flex items-center gap-2">
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
                        w-full cursor-pointer appearance-none rounded-lg border px-4 py-2.5 pr-8 text-sm font-medium transition-all focus:outline-none focus:ring-2
                        ${isDarkMode 
                          ? "border-indigo-500/30 bg-slate-800 text-slate-200 focus:border-indigo-400 focus:ring-indigo-400/20" 
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
                    <ChevronDownIcon className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`} />
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => updateTask(task._id)}
                    disabled={savingTaskId === task._id}
                    className={`
                      relative shrink-0 rounded-lg px-5 py-2.5 text-sm font-medium text-white shadow-lg overflow-hidden
                      ${isDarkMode 
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700" 
                        : "bg-blue-500 hover:bg-blue-600"
                      }
                    `}
                  >
                    {isDarkMode && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      />
                    )}
                    <span className="relative z-10">
                      {savingTaskId === task._id ? (
                        <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        "Save"
                      )}
                    </span>
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Desktop Table View */}
        <div className={`hidden overflow-hidden rounded-xl border lg:block ${
          isDarkMode ? "border-indigo-500/20" : "border-slate-200"
        }`}>
          <table className={`w-full table-fixed divide-y ${
            isDarkMode ? "divide-indigo-500/20" : "divide-slate-200"
          }`}>
            <colgroup>
              <col className="w-[32%]" />
              <col className="w-[18%]" />
              <col className="w-[12%]" />
              <col className="w-[8%]" />
              <col className="w-[10%]" />
              <col className="w-[20%]" />
            </colgroup>
            <thead className={isDarkMode ? "bg-indigo-950/50" : "bg-slate-50"}>
              <tr>
                {["Task", "Assigned By", "Date", "Priority", "Status", "Actions"].map((header) => (
                  <th key={header} className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? "text-indigo-400" : "text-slate-500"
                  }`}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${
              isDarkMode ? "divide-indigo-500/20 bg-slate-900/50" : "divide-slate-200 bg-white"
            }`}>
              <AnimatePresence>
                {filteredTasks.map((task, index) => (
                  <motion.tr
                    key={task._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className={`group transition-all ${
                      isDarkMode ? "hover:bg-indigo-950/30" : "hover:bg-slate-50"
                    }`}
                    style={
                      task.priority === "high" && isDarkMode
                        ? {
                            boxShadow: "inset 3px 0 0 rgba(244, 63, 94, 0.5), 0 0 20px rgba(244,63,94,0.1)",
                          }
                        : task.priority === "high"
                        ? { boxShadow: "inset 3px 0 0 rgba(244, 63, 94, 0.45)" }
                        : undefined
                    }
                  >
                    <td className="px-6 py-4">
                      <div>
                        <button
                          type="button"
                          onClick={() => openTaskDetails(task)}
                          className={`text-left font-medium transition-colors ${
                            isDarkMode ? "text-slate-200 hover:text-indigo-400" : "text-slate-900 hover:text-blue-600"
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
                            isDarkMode ? "text-indigo-400 hover:text-indigo-300" : "text-blue-600 hover:text-blue-700"
                          }`}
                        >
                          <EyeIcon className="h-3.5 w-3.5" />
                          View details
                        </button>
                        {shouldShowTaskProgress(task) && (
                          <div className={`mt-3 max-w-[260px] rounded-xl border p-3 ${
                            isDarkMode ? "border-indigo-500/20 bg-slate-900/60" : "border-slate-200 bg-slate-50"
                          }`}>
                            <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                              <span className={isDarkMode ? "font-medium text-slate-400" : "font-medium text-slate-600"}>
                                Progress
                              </span>
                              <span className={isDarkMode ? "font-semibold text-indigo-400" : "font-semibold text-slate-700"}>
                                {getTaskProgressPercent(task, now)}%
                              </span>
                            </div>
                            <div className={`relative h-2 overflow-hidden rounded-full ${
                              isDarkMode ? "bg-slate-800" : "bg-slate-200"
                            }`}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${getTaskProgressPercent(task, now)}%` }}
                                transition={{ duration: 1 }}
                                className={`absolute inset-0 bg-gradient-to-r ${getTaskProgressClasses(task, now)}`}
                              />
                              {isDarkMode && (
                                <motion.div
                                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                                  animate={{ x: ['-100%', '200%'] }}
                                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                />
                              )}
                            </div>
                            <p className={`mt-2 text-xs font-medium ${
                              isDarkMode ? "text-slate-400" : "text-slate-500"
                            }`}>
                              {getTaskTimingText(task, now)}
                            </p>
                          </div>
                        )}
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
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${
                          PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium
                        }`}
                      >
                        {task.priority}
                      </motion.span>
                    </td>
                    <td className="px-6 py-4">
                      <motion.span
                        whileHover={{ scale: 1.05 }}
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${
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
                            className={`
                              w-[7.5rem] cursor-pointer appearance-none rounded-lg border px-3 py-2 pr-7 text-sm font-medium transition-all focus:outline-none focus:ring-2
                              ${isDarkMode 
                                ? "border-indigo-500/30 bg-slate-800 text-slate-200 focus:border-indigo-400 focus:ring-indigo-400/20" 
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
                          <ChevronDownIcon className={`absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 ${
                            isDarkMode ? "text-slate-400" : "text-slate-500"
                          }`} />
                        </div>

                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() => updateTask(task._id)}
                          disabled={savingTaskId === task._id}
                          className={`
                            relative shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-white shadow-lg overflow-hidden
                            ${isDarkMode 
                              ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700" 
                              : "bg-blue-500 hover:bg-blue-600"
                            }
                          `}
                        >
                          {isDarkMode && (
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                              animate={{ x: ['-100%', '200%'] }}
                              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            />
                          )}
                          <span className="relative z-10">
                            {savingTaskId === task._id ? (
                              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            ) : (
                              "Save"
                            )}
                          </span>
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {filteredTasks.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-6 rounded-2xl border border-dashed p-12 text-center ${
              isDarkMode ? "border-indigo-500/30 bg-slate-900/50" : "border-slate-300 bg-slate-50"
            }`}
          >
            <CpuChipIcon className={`mx-auto h-12 w-12 mb-4 ${isDarkMode ? "text-indigo-400/50" : "text-slate-400"}`} />
            <p className={`text-lg font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
              No tasks match the current filters
            </p>
            <p className={`mt-2 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
              Try changing the search, status, or priority filter
            </p>
          </motion.div>
        )}
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