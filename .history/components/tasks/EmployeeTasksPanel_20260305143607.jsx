"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  FunnelIcon,
  MoonIcon,
  SunIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

import TaskDetailsModal from "@/components/tasks/TaskDetailsModal";
import { apiFetch } from "@/lib/client-api";
import {
  getTaskProgressClasses,
  getTaskProgressPercent,
  getTaskTimingText,
  shouldShowTaskProgress,
} from "@/lib/task-progress";

const STATUS_OPTIONS = ["pending", "in-progress", "completed"];
const PRIORITY_OPTIONS = ["low", "medium", "high"];
const AUTO_REFRESH_MS = 5000;

const STATUS_STYLES = {
  pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  "in-progress": "bg-blue-500/10 text-blue-500 border-blue-500/20",
  completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
};

const PRIORITY_STYLES = {
  low: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  medium: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  high: "bg-rose-500/10 text-rose-500 border-rose-500/20",
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
      staggerChildren: 0.08,
      delayChildren: 0.12,
    },
  },
};

const itemVariants = {
  hidden: { y: 16, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.35 },
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

  const updateTask = useCallback(
    async (taskId) => {
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
    },
    [loadTasks, selectedStatus],
  );

  const openTaskDetails = (task) => setSelectedTask(task);
  const closeTaskDetails = () => setSelectedTask(null);

  const handleTaskUpdated = useCallback((updatedTask) => {
    setTasks((prev) => prev.map((task) => (task._id === updatedTask._id ? updatedTask : task)));
    setSelectedTask(updatedTask);
  }, []);

  const shellClasses = isDarkMode
    ? "bg-slate-950 text-slate-100"
    : "bg-slate-100 text-slate-900";
  const panelClasses = isDarkMode
    ? "border-slate-800 bg-slate-900/85"
    : "border-slate-200 bg-white";
  const mutedTextClass = isDarkMode ? "text-slate-300" : "text-slate-600";
  const labelTextClass = isDarkMode ? "text-slate-400" : "text-slate-500";

  return (
    <motion.div
      className={`min-h-screen p-4 transition-colors duration-300 md:p-6 lg:p-8 ${shellClasses}`}
      initial="hidden"
      animate={isLoaded ? "visible" : "hidden"}
      variants={containerVariants}
    >
      <motion.section
        variants={itemVariants}
        className={`mb-8 rounded-3xl border p-5 md:p-6 ${panelClasses}`}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className={`text-3xl font-bold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
              Employee Task Dashboard
            </h1>
            <p className={`mt-1 text-sm ${mutedTextClass}`}>
              Track progress, update status, and prioritize important tasks.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsDarkMode((prev) => !prev)}
              className={`rounded-full border p-2 transition ${
                isDarkMode
                  ? "border-slate-700 bg-slate-800 text-amber-300 hover:bg-slate-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {isDarkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
            </button>
            <div
              className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
                isDarkMode ? "border-blue-500/30 bg-blue-500/10 text-blue-300" : "border-blue-200 bg-blue-50 text-blue-700"
              }`}
            >
              Completion: {completionRate}%
            </div>
          </div>
        </div>
      </motion.section>

      {highPriorityTasks.length > 0 ? (
        <motion.section
          variants={itemVariants}
          className={`mb-8 rounded-2xl border p-5 ${isDarkMode ? "border-rose-500/30 bg-rose-500/10" : "border-rose-200 bg-rose-50"}`}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className={`mt-0.5 h-6 w-6 ${isDarkMode ? "text-rose-300" : "text-rose-600"}`} />
              <div>
                <h2 className={`text-lg font-semibold ${isDarkMode ? "text-rose-200" : "text-rose-700"}`}>
                  High Priority Tasks
                </h2>
                <p className={`text-sm ${isDarkMode ? "text-rose-100/90" : "text-rose-700/80"}`}>
                  {highPriorityTasks.length} task{highPriorityTasks.length === 1 ? "" : "s"} need attention.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {highPriorityTasks.slice(0, 4).map((task) => (
              <button
                key={task._id}
                type="button"
                onClick={() => openTaskDetails(task)}
                className={`rounded-xl border p-4 text-left transition ${
                  isDarkMode
                    ? "border-rose-500/30 bg-slate-950/60 hover:bg-slate-900"
                    : "border-rose-200 bg-white hover:bg-rose-50"
                }`}
              >
                <p className={`text-base font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>{task.title}</p>
                <p className={`mt-1 text-sm ${mutedTextClass}`}>{truncateWords(task.description, 10, 90)}</p>
                <div className={`mt-3 flex flex-wrap gap-3 text-xs ${labelTextClass}`}>
                  <span>Due: {new Date(task.taskDate).toLocaleDateString()}</span>
                  <span>Status: {formatStatusLabel(task.status)}</span>
                </div>
              </button>
            ))}
          </div>
        </motion.section>
      ) : null}

      <motion.section variants={itemVariants} className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Tasks", value: counts.total, icon: ChartBarIcon, bar: 100, color: "blue" },
          { label: "Completed", value: counts.completed, icon: CheckCircleIcon, bar: completedProgress, color: "emerald" },
          { label: "In Progress", value: counts.pending, icon: ClockIcon, bar: pendingProgress, color: "amber" },
          { label: "Completion Rate", value: `${completionRate}%`, icon: FunnelIcon, bar: completionRate, color: "violet" },
        ].map((card) => (
          <div key={card.label} className={`rounded-2xl border p-5 ${panelClasses}`}>
            <card.icon className={`h-6 w-6 ${isDarkMode ? "text-slate-200" : "text-slate-700"}`} />
            <p className={`mt-3 text-sm ${labelTextClass}`}>{card.label}</p>
            <p className={`mt-1 text-3xl font-bold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>{card.value}</p>
            <div className={`mt-4 h-2 w-full overflow-hidden rounded-full ${isDarkMode ? "bg-slate-800" : "bg-slate-200"}`}>
              <div
                className={`h-full rounded-full ${
                  card.color === "blue"
                    ? "bg-blue-500"
                    : card.color === "emerald"
                      ? "bg-emerald-500"
                      : card.color === "amber"
                        ? "bg-amber-500"
                        : "bg-violet-500"
                }`}
                style={{ width: `${card.bar}%` }}
              />
            </div>
          </div>
        ))}
      </motion.section>

      <motion.section variants={itemVariants} className={`rounded-2xl border p-5 md:p-6 ${panelClasses}`}>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className={`text-xl font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>My Assigned Tasks</h2>
          <button
            type="button"
            onClick={() => setIsFilterOpen((prev) => !prev)}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition ${
              isDarkMode ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : "Filters"}
          </button>
        </div>

        <AnimatePresence>
          {isFilterOpen ? (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mb-6 rounded-xl border p-4 ${isDarkMode ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-slate-50"}`}
            >
              <div className="grid gap-3 md:grid-cols-4">
                <div className="md:col-span-2">
                  <label className={`mb-1 block text-xs font-semibold uppercase tracking-wide ${labelTextClass}`}>Search</label>
                  <input
                    type="text"
                    value={taskSearch}
                    onChange={(event) => setTaskSearch(event.target.value)}
                    placeholder="Search title, description, assigned by"
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                      isDarkMode
                        ? "border-slate-700 bg-slate-800 text-slate-200 placeholder:text-slate-500 focus:ring-blue-400/30"
                        : "border-slate-300 bg-white text-slate-800 focus:ring-blue-200"
                    }`}
                  />
                </div>
                <div>
                  <label className={`mb-1 block text-xs font-semibold uppercase tracking-wide ${labelTextClass}`}>Status</label>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                      isDarkMode
                        ? "border-slate-700 bg-slate-800 text-slate-200 focus:ring-blue-400/30"
                        : "border-slate-300 bg-white text-slate-800 focus:ring-blue-200"
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
                  <label className={`mb-1 block text-xs font-semibold uppercase tracking-wide ${labelTextClass}`}>Priority</label>
                  <select
                    value={priorityFilter}
                    onChange={(event) => setPriorityFilter(event.target.value)}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                      isDarkMode
                        ? "border-slate-700 bg-slate-800 text-slate-200 focus:ring-blue-400/30"
                        : "border-slate-300 bg-white text-slate-800 focus:ring-blue-200"
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

              <div className="mt-4 flex items-center justify-between gap-3">
                <p className={`text-sm ${mutedTextClass}`}>
                  Showing {filteredTasks.length} of {tasks.length} tasks
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setTaskSearch("");
                    setStatusFilter("all");
                    setPriorityFilter("all");
                  }}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    isDarkMode
                      ? "border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Reset
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {error ? (
          <div className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-400">{error}</div>
        ) : null}

        <div className="space-y-3 lg:hidden">
          <AnimatePresence mode="popLayout">
            {filteredTasks.map((task) => (
              <motion.div
                key={task._id}
                layout
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                className={`rounded-xl border p-4 ${isDarkMode ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => openTaskDetails(task)}
                    className={`text-left font-semibold ${isDarkMode ? "text-slate-100 hover:text-blue-300" : "text-slate-900 hover:text-blue-600"}`}
                  >
                    {task.title}
                  </button>
                  <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium}`}>
                    {task.priority}
                  </span>
                </div>

                <p className={`mt-1 text-sm ${mutedTextClass}`}>{truncateWords(task.description, 2)}</p>

                <button
                  type="button"
                  onClick={() => openTaskDetails(task)}
                  className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${isDarkMode ? "text-blue-300 hover:text-blue-200" : "text-blue-600 hover:text-blue-700"}`}
                >
                  <EyeIcon className="h-3.5 w-3.5" />
                  View details
                </button>

                <div className={`mt-3 flex flex-wrap items-center gap-3 text-xs ${labelTextClass}`}>
                  <span>Assigned by: {task.assignedBy?.name || "Unknown"}</span>
                  <span>Due: {new Date(task.taskDate).toLocaleDateString()}</span>
                </div>

                {shouldShowTaskProgress(task) ? (
                  <div className={`mt-4 rounded-lg border p-3 ${isDarkMode ? "border-slate-700 bg-slate-950" : "border-slate-200 bg-slate-50"}`}>
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className={labelTextClass}>Progress</span>
                      <span className={`font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>{getTaskProgressPercent(task, now)}%</span>
                    </div>
                    <div className={`h-2 overflow-hidden rounded-full ${isDarkMode ? "bg-slate-800" : "bg-slate-200"}`}>
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${getTaskProgressClasses(task, now)}`}
                        style={{ width: `${getTaskProgressPercent(task, now)}%` }}
                      />
                    </div>
                    <p className={`mt-2 text-xs ${labelTextClass}`}>{getTaskTimingText(task, now)}</p>
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
                      className={`w-full appearance-none rounded-lg border px-3 py-2 pr-8 text-sm font-medium focus:outline-none focus:ring-2 ${
                        isDarkMode
                          ? "border-slate-700 bg-slate-800 text-slate-200 focus:ring-blue-400/30"
                          : "border-slate-300 bg-white text-slate-700 focus:ring-blue-200"
                      }`}
                    >
                      {STATUS_OPTIONS.map((statusOption) => (
                        <option key={statusOption} value={statusOption}>
                          {formatStatusLabel(statusOption)}
                        </option>
                      ))}
                    </select>
                    <ChevronDownIcon className={`pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 ${labelTextClass}`} />
                  </div>
                  <button
                    type="button"
                    onClick={() => updateTask(task._id)}
                    disabled={savingTaskId === task._id}
                    className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50 ${
                      isDarkMode ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-500 hover:bg-blue-600"
                    }`}
                  >
                    {savingTaskId === task._id ? "Saving..." : "Save"}
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className={`hidden overflow-hidden rounded-xl border lg:block ${isDarkMode ? "border-slate-700" : "border-slate-200"}`}>
          <table className={`w-full table-fixed divide-y ${isDarkMode ? "divide-slate-700" : "divide-slate-200"}`}>
            <colgroup>
              <col className="w-[32%]" />
              <col className="w-[18%]" />
              <col className="w-[12%]" />
              <col className="w-[8%]" />
              <col className="w-[10%]" />
              <col className="w-[20%]" />
            </colgroup>
            <thead className={isDarkMode ? "bg-slate-900" : "bg-slate-50"}>
              <tr>
                {["Task", "Assigned By", "Date", "Priority", "Status", "Actions"].map((header) => (
                  <th key={header} className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wide ${labelTextClass}`}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? "divide-slate-700 bg-slate-950/60" : "divide-slate-200 bg-white"}`}>
              <AnimatePresence>
                {filteredTasks.map((task, index) => (
                  <motion.tr
                    key={task._id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -14 }}
                    transition={{ delay: index * 0.04 }}
                    className={isDarkMode ? "hover:bg-slate-900/80" : "hover:bg-slate-50"}
                  >
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => openTaskDetails(task)}
                        className={`text-left font-medium ${isDarkMode ? "text-slate-100 hover:text-blue-300" : "text-slate-900 hover:text-blue-600"}`}
                      >
                        {task.title}
                      </button>
                      <p title={task.description} className={`mt-1 max-w-[230px] truncate text-sm ${mutedTextClass}`}>
                        {truncateWords(task.description, 2)}
                      </p>
                      <button
                        type="button"
                        onClick={() => openTaskDetails(task)}
                        className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${isDarkMode ? "text-blue-300 hover:text-blue-200" : "text-blue-600 hover:text-blue-700"}`}
                      >
                        <EyeIcon className="h-3.5 w-3.5" />
                        View details
                      </button>
                      {shouldShowTaskProgress(task) ? (
                        <div className={`mt-3 max-w-[260px] rounded-lg border p-3 ${isDarkMode ? "border-slate-700 bg-slate-950" : "border-slate-200 bg-slate-50"}`}>
                          <div className="mb-2 flex items-center justify-between text-xs">
                            <span className={labelTextClass}>Progress</span>
                            <span className={`font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>{getTaskProgressPercent(task, now)}%</span>
                          </div>
                          <div className={`h-2 overflow-hidden rounded-full ${isDarkMode ? "bg-slate-800" : "bg-slate-200"}`}>
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${getTaskProgressClasses(task, now)}`}
                              style={{ width: `${getTaskProgressPercent(task, now)}%` }}
                            />
                          </div>
                          <p className={`mt-2 text-xs ${labelTextClass}`}>{getTaskTimingText(task, now)}</p>
                        </div>
                      ) : null}
                    </td>
                    <td className={`px-6 py-4 text-sm ${mutedTextClass}`}>
                      <p className="truncate">{task.assignedBy?.name || "Unknown"}</p>
                    </td>
                    <td className={`px-6 py-4 text-sm ${mutedTextClass}`}>
                      <p className="truncate">{new Date(task.taskDate).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${STATUS_STYLES[task.status] || STATUS_STYLES.pending}`}>
                        {formatStatusLabel(task.status)}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <div className="relative">
                          <select
                            value={selectedStatus[task._id] || task.status}
                            onChange={(event) =>
                              setSelectedStatus((prev) => ({
                                ...prev,
                                [task._id]: event.target.value,
                              }))
                            }
                            className={`w-[8.5rem] appearance-none rounded-lg border px-2.5 py-2 pr-7 text-sm font-medium focus:outline-none focus:ring-2 ${
                              isDarkMode
                                ? "border-slate-700 bg-slate-800 text-slate-200 focus:ring-blue-400/30"
                                : "border-slate-300 bg-white text-slate-700 focus:ring-blue-200"
                            }`}
                          >
                            {STATUS_OPTIONS.map((statusOption) => (
                              <option key={statusOption} value={statusOption}>
                                {formatStatusLabel(statusOption)}
                              </option>
                            ))}
                          </select>
                          <ChevronDownIcon className={`pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 ${labelTextClass}`} />
                        </div>
                        <button
                          type="button"
                          onClick={() => updateTask(task._id)}
                          disabled={savingTaskId === task._id}
                          className={`rounded-lg px-3 py-2 text-xs font-semibold text-white transition disabled:opacity-50 ${
                            isDarkMode ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-500 hover:bg-blue-600"
                          }`}
                        >
                          {savingTaskId === task._id ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {filteredTasks.length === 0 ? (
          <div className={`mt-6 rounded-xl border border-dashed p-8 text-center ${isDarkMode ? "border-slate-700 bg-slate-900/70" : "border-slate-300 bg-slate-50"}`}>
            <p className={`text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
              No tasks match the current filters
            </p>
            <p className={`mt-1 text-xs ${labelTextClass}`}>Try changing the search, status, or priority filter.</p>
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
