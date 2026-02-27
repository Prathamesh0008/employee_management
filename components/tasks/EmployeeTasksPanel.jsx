"use client";

import { apiFetch } from "@/lib/client-api";
import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircleIcon, 
  ClockIcon, 
  ChartBarIcon,
  ChevronDownIcon,
  SparklesIcon,
  EyeIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const STATUS_OPTIONS = ["pending", "in-progress", "completed"];

const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  "in-progress": "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const PRIORITY_STYLES = {
  low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  high: "bg-rose-50 text-rose-700 border-rose-200",
};

function formatStatusLabel(status) {
  return String(status)
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const counts = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((task) => task.status === "completed").length;
    const pending = tasks.filter((task) => task.status !== "completed").length;

    return { total, completed, pending };
  }, [tasks]);

  const completionRate = useMemo(() => {
    return counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0;
  }, [counts]);

  const updateTask = async (taskId) => {
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

      setTasks((previous) =>
        previous.map((task) => (task._id === taskId ? { ...task, status: data.task.status } : task)),
      );
    } catch {
      setError("Unable to update task");
    } finally {
      setSavingTaskId("");
    }
  };

  const openTaskDetails = (task) => {
    setSelectedTask(task);
  };

  const closeTaskDetails = () => {
    setSelectedTask(null);
  };

  return (
    <motion.div 
      className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4 md:p-6 lg:p-8"
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
            className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent md:text-3xl"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Task Dashboard
          </motion.h1>
          <motion.p 
            className="mt-1 text-sm text-slate-500"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Manage and track your assigned tasks efficiently
          </motion.p>
        </div>
        <motion.div 
          className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <SparklesIcon className="h-5 w-5 text-blue-500" />
          <span className="text-sm font-medium text-slate-700">Performance: {completionRate}%</span>
        </motion.div>
      </motion.div>

      {/* Stats Cards */}
      <motion.section 
        variants={itemVariants}
        className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <motion.div
          variants={cardVariants}
          whileHover="hover"
          whileTap="tap"
          className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-lg transition-shadow hover:shadow-xl"
        >
          <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-blue-50 transition-transform group-hover:scale-150" />
          <ChartBarIcon className="relative h-8 w-8 text-blue-500" />
          <p className="relative mt-4 text-sm font-medium text-slate-500">Total Tasks</p>
          <p className="relative mt-1 text-3xl font-bold text-slate-900">{counts.total}</p>
          <div className="relative mt-2 h-1.5 w-full rounded-full bg-slate-100">
            <motion.div 
              className="h-1.5 rounded-full bg-blue-500"
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
          className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-lg transition-shadow hover:shadow-xl"
        >
          <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-emerald-50 transition-transform group-hover:scale-150" />
          <CheckCircleIcon className="relative h-8 w-8 text-emerald-500" />
          <p className="relative mt-4 text-sm font-medium text-slate-500">Completed</p>
          <p className="relative mt-1 text-3xl font-bold text-emerald-600">{counts.completed}</p>
          <div className="relative mt-2 h-1.5 w-full rounded-full bg-slate-100">
            <motion.div 
              className="h-1.5 rounded-full bg-emerald-500"
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
          className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-lg transition-shadow hover:shadow-xl"
        >
          <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-amber-50 transition-transform group-hover:scale-150" />
          <ClockIcon className="relative h-8 w-8 text-amber-500" />
          <p className="relative mt-4 text-sm font-medium text-slate-500">In Progress</p>
          <p className="relative mt-1 text-3xl font-bold text-amber-600">{counts.pending}</p>
          <div className="relative mt-2 h-1.5 w-full rounded-full bg-slate-100">
            <motion.div 
              className="h-1.5 rounded-full bg-amber-500"
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
          className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-lg transition-shadow hover:shadow-xl"
        >
          <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-purple-50 transition-transform group-hover:scale-150" />
          <svg className="relative h-8 w-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <p className="relative mt-4 text-sm font-medium text-slate-500">Completion Rate</p>
          <p className="relative mt-1 text-3xl font-bold text-purple-600">{completionRate}%</p>
          <div className="relative mt-2 h-1.5 w-full rounded-full bg-slate-100">
            <motion.div 
              className="h-1.5 rounded-full bg-purple-500"
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
        className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-lg backdrop-blur-sm"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">My Assigned Tasks</h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-md hover:bg-blue-600"
          >
            Filter Tasks
          </motion.button>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-lg bg-rose-50 p-4 text-sm text-rose-600"
          >
            {error}
          </motion.div>
        )}

        {/* Mobile View */}
        <div className="space-y-3 lg:hidden">
          <AnimatePresence mode="popLayout">
            {tasks.map((task, index) => (
              <motion.div
                key={task._id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.1 }}
                className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <button
                    type="button"
                    onClick={() => openTaskDetails(task)}
                    className="text-left font-semibold text-slate-900 hover:text-blue-600"
                  >
                    {task.title}
                  </button>
                  <motion.span
                    whileHover={{ scale: 1.1 }}
                    className={`rounded-full border px-2 py-1 text-xs font-medium ${
                      PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium
                    }`}
                  >
                    {task.priority}
                  </motion.span>
                </div>
                
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">{task.description}</p>

                <button
                  type="button"
                  onClick={() => openTaskDetails(task)}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  <EyeIcon className="h-3.5 w-3.5" />
                  View details
                </button>
                
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
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
                      className="w-full cursor-pointer appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-8 text-sm font-medium text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      {STATUS_OPTIONS.map((statusOption) => (
                        <option key={statusOption} value={statusOption}>
                          {formatStatusLabel(statusOption)}
                        </option>
                      ))}
                    </select>
                    <ChevronDownIcon className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => updateTask(task._id)}
                    disabled={savingTaskId === task._id}
                    className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-600 disabled:bg-blue-300"
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
        <div className="hidden overflow-x-auto rounded-xl border border-slate-200 lg:block">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Task</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Assigned By</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Date</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Priority</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              <AnimatePresence>
                {tasks.map((task, index) => (
                  <motion.tr
                    key={task._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className="group hover:bg-slate-50"
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <div>
                        <button
                          type="button"
                          onClick={() => openTaskDetails(task)}
                          className="text-left font-medium text-slate-900 hover:text-blue-600"
                        >
                          {task.title}
                        </button>
                        <p className="max-w-md truncate text-sm text-slate-500">{task.description}</p>
                        <button
                          type="button"
                          onClick={() => openTaskDetails(task)}
                          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                        >
                          <EyeIcon className="h-3.5 w-3.5" />
                          View details
                        </button>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                      {task.assignedBy?.name || "Unknown"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                      {new Date(task.taskDate).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <motion.span
                        whileHover={{ scale: 1.05 }}
                        className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${
                          PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium
                        }`}
                      >
                        {task.priority}
                      </motion.span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <motion.span
                        whileHover={{ scale: 1.05 }}
                        className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${
                          STATUS_STYLES[task.status] || STATUS_STYLES.pending
                        }`}
                      >
                        {formatStatusLabel(task.status)}
                      </motion.span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <select
                            value={selectedStatus[task._id] || task.status}
                            onChange={(event) =>
                              setSelectedStatus((prev) => ({
                                ...prev,
                                [task._id]: event.target.value,
                              }))
                            }
                            className="cursor-pointer appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-8 text-sm font-medium text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          >
                            {STATUS_OPTIONS.map((statusOption) => (
                              <option key={statusOption} value={statusOption}>
                                {formatStatusLabel(statusOption)}
                              </option>
                            ))}
                          </select>
                          <ChevronDownIcon className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>

                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() => updateTask(task._id)}
                          disabled={savingTaskId === task._id}
                          className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-600 disabled:bg-blue-300"
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
      </motion.section>

      <AnimatePresence>
        {selectedTask ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
            onClick={closeTaskDetails}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <h3 className="text-lg font-semibold text-slate-900">Task Details</h3>
                <button
                  type="button"
                  onClick={closeTaskDetails}
                  className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 px-5 py-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Title</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{selectedTask.title}</p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Description</p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700">
                    {selectedTask.description || "-"}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="text-xs text-slate-500">Assigned By</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {selectedTask.assignedBy?.name || "Unknown"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="text-xs text-slate-500">Task Date</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {new Date(selectedTask.taskDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="text-xs text-slate-500">Priority</p>
                    <span
                      className={`mt-1 inline-flex rounded-full border px-2 py-1 text-xs font-medium ${
                        PRIORITY_STYLES[selectedTask.priority] || PRIORITY_STYLES.medium
                      }`}
                    >
                      {selectedTask.priority}
                    </span>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="text-xs text-slate-500">Status</p>
                    <span
                      className={`mt-1 inline-flex rounded-full border px-2 py-1 text-xs font-medium ${
                        STATUS_STYLES[selectedTask.status] || STATUS_STYLES.pending
                      }`}
                    >
                      {formatStatusLabel(selectedTask.status)}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
