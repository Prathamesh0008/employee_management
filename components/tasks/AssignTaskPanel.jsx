"use client";

import TaskDetailsModal from "@/components/tasks/TaskDetailsModal";
import { apiFetch } from "@/lib/client-api";
import {
  getTaskProgressClasses,
  getTaskProgressPercent,
  getTaskTimingText,
} from "@/lib/task-progress";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  PlusIcon, 
  UserGroupIcon, 
  CalendarIcon,
  FlagIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  EyeIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";

const PRIORITY_STYLES = {
  low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  high: "bg-rose-50 text-rose-700 border-rose-200",
};

const STATUS_STYLES = {
  pending: "bg-slate-50 text-slate-700 border-slate-200",
  "in-progress": "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-green-50 text-green-700 border-green-200",
};
const AUTO_REFRESH_MS = 5000;

function truncateWords(text, maxWords = 2, maxChars = 28) {
  const value = String(text || "").trim();
  if (!value) return "-";
  const words = value.split(/\s+/);
  const sliced = words.slice(0, maxWords).join(" ");
  const shortByWords = words.length > maxWords ? `${sliced}...` : sliced;
  if (shortByWords.length <= maxChars) return shortByWords;
  return `${shortByWords.slice(0, maxChars).trimEnd()}...`;
}

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
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25,
    },
  },
  tap: { scale: 0.98 },
};

export default function AssignTaskPanel({ employees, initialTasks }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [now, setNow] = useState(0);
  const [form, setForm] = useState({
    title: "",
    description: "",
    assignedTo: employees[0]?._id || "",
    priority: "medium",
    taskDate: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

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

      setTasks(data.tasks || []);
    } catch {
      if (!silent) {
        setError("Unable to refresh tasks");
      }
    }
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

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await apiFetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to assign task");
        return;
      }

      setForm((prev) => ({
        ...prev,
        title: "",
        description: "",
        priority: "medium",
        taskDate: new Date().toISOString().slice(0, 10),
      }));
      await loadTasks({ silent: true });
      
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch {
      setError("Unable to assign task");
    } finally {
      setSubmitting(false);
    }
  };

  const clearForm = () => {
    setForm({
      title: "",
      description: "",
      assignedTo: employees[0]?._id || "",
      priority: "medium",
      taskDate: new Date().toISOString().slice(0, 10),
    });
  };

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
      className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-4 md:p-6 lg:p-8"
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
            className="text-2xl font-bold bg-gradient-to-r from-indigo-900 to-indigo-700 bg-clip-text text-transparent md:text-3xl"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Task Assignment Portal
          </motion.h1>
          <motion.p 
            className="mt-1 text-sm text-slate-500"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Create and manage tasks for your team efficiently
          </motion.p>
        </div>
        <motion.div 
          className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ClipboardDocumentListIcon className="h-5 w-5 text-indigo-500" />
          <span className="text-sm font-medium text-slate-700">
            {tasks.length} {tasks.length === 1 ? 'Task' : 'Tasks'} Assigned
          </span>
        </motion.div>
      </motion.div>

      {/* Success Message */}
      <AnimatePresence>
        {showSuccessMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-4 text-emerald-700"
          >
            <CheckCircleIcon className="h-5 w-5" />
            <span className="text-sm font-medium">Task assigned successfully!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assign Task Form Section */}
      <motion.section 
        variants={itemVariants}
        className="mb-8 rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-lg backdrop-blur-sm"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-full bg-indigo-100 p-2">
            <PlusIcon className="h-5 w-5 text-indigo-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900">Assign New Task</h2>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Task Title */}
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="space-y-1"
            >
              <label className="text-sm font-medium text-slate-700">Task Title</label>
              <input
                name="title"
                required
                value={form.title}
                onChange={onChange}
                placeholder="Enter task title"
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </motion.div>

            {/* Assign To */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="space-y-1"
            >
              <label className="text-sm font-medium text-slate-700">Assign To</label>
              <div className="relative">
                <select
                  name="assignedTo"
                  required
                  value={form.assignedTo}
                  onChange={onChange}
                  className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-4 py-2.5 pr-10 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  {employees.map((employee) => (
                    <option key={employee._id} value={employee._id}>
                      {employee.name} ({employee.email})
                    </option>
                  ))}
                </select>
                <UserGroupIcon className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              </div>
            </motion.div>

            {/* Description - Full Width */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="space-y-1 md:col-span-2"
            >
              <label className="text-sm font-medium text-slate-700">Description</label>
              <textarea
                name="description"
                required
                value={form.description}
                onChange={onChange}
                placeholder="Describe the task in detail..."
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </motion.div>

            {/* Priority */}
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="space-y-1"
            >
              <label className="text-sm font-medium text-slate-700">Priority Level</label>
              <div className="relative">
                <select
                  name="priority"
                  value={form.priority}
                  onChange={onChange}
                  className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-4 py-2.5 pr-10 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
                <FlagIcon className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              </div>
            </motion.div>

            {/* Due Date */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="space-y-1"
            >
              <label className="text-sm font-medium text-slate-700">Due Date</label>
              <div className="relative">
                <input
                  type="date"
                  name="taskDate"
                  required
                  value={form.taskDate}
                  onChange={onChange}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
                <CalendarIcon className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              </div>
            </motion.div>
          </div>

          {/* Form Actions */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-end"
          >
            <motion.button
              type="button"
              onClick={clearForm}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="rounded-lg border border-slate-300 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Clear Form
            </motion.button>
            
            <motion.button
              type="submit"
              disabled={submitting || employees.length === 0}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-md transition-colors hover:bg-indigo-700 disabled:bg-indigo-400"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Assigning...
                </span>
              ) : (
                "Assign Task"
              )}
            </motion.button>
          </motion.div>
        </form>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 flex items-center gap-2 rounded-lg bg-rose-50 p-4 text-rose-600"
            >
              <XMarkIcon className="h-5 w-5" />
              <span className="text-sm">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {/* Tasks List Section */}
      <motion.section 
        variants={itemVariants}
        className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-lg backdrop-blur-sm"
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-indigo-100 p-2">
              <ClipboardDocumentListIcon className="h-5 w-5 text-indigo-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">Tasks Assigned By You</h2>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Filter
          </motion.button>
        </div>

        {/* Mobile View */}
        <div className="space-y-3 lg:hidden">
          <AnimatePresence mode="popLayout">
            {tasks.map((task, index) => (
              <motion.div
                key={task._id}
                layout
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, x: -20 }}
                whileHover="hover"
                whileTap="tap"
                className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-slate-900">{task.title}</h3>
                  <motion.span
                    whileHover={{ scale: 1.1 }}
                    className={`rounded-full border px-2 py-1 text-xs font-medium ${
                      PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium
                    }`}
                  >
                    {task.priority}
                  </motion.span>
                </div>
                
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {truncateWords(task.description, 2)}
                </p>
                
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1">
                    <UserGroupIcon className="h-3 w-3" />
                    {task.assignedTo?.name || "Unknown"}
                  </span>
                  <span className="flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1">
                    <CalendarIcon className="h-3 w-3" />
                    {new Date(task.taskDate).toLocaleDateString()}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-1 text-xs font-medium ${
                      STATUS_STYLES[task.status] || STATUS_STYLES.pending
                    }`}
                  >
                    {formatStatusLabel(task.status)}
                  </span>
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-slate-600">Progress</span>
                      <span className="font-semibold text-slate-700">
                        {getTaskProgressPercent(task, now)}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${getTaskProgressClasses(task, now)}`}
                        style={{ width: `${getTaskProgressPercent(task, now)}%` }}
                      />
                    </div>
                  <p className="mt-2 text-xs font-medium text-slate-500">
                    {getTaskTimingText(task, now)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => openTaskDetails(task)}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                >
                  <EyeIcon className="h-3.5 w-3.5" />
                  View comments
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Desktop Table View */}
        <div className="hidden overflow-hidden rounded-xl border border-slate-200 lg:block">
          <table className="w-full table-auto divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Task Details</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Employee</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Due Date</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Priority</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status & Progress</th>
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
                    whileHover={{ backgroundColor: "rgba(241, 245, 249, 0.5)" }}
                    className="transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <button
                          type="button"
                          onClick={() => openTaskDetails(task)}
                          className="text-left font-medium text-slate-900 hover:text-indigo-700"
                        >
                          {task.title}
                        </button>
                        <p
                          title={task.description}
                          className="mt-1 max-w-[230px] truncate text-sm text-slate-600"
                        >
                          {truncateWords(task.description, 2)}
                        </p>
                        <button
                          type="button"
                          onClick={() => openTaskDetails(task)}
                          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                        >
                          <EyeIcon className="h-3.5 w-3.5" />
                          View comments
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                          <span className="text-xs font-medium text-indigo-700">
                            {task.assignedTo?.name?.charAt(0) || "U"}
                          </span>
                        </div>
                        <span className="text-sm text-slate-600">{task.assignedTo?.name || "Unknown"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-slate-400" />
                        {new Date(task.taskDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <motion.span
                        whileHover={{ scale: 1.05 }}
                        className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${
                          PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium
                        }`}
                      >
                        {task.priority}
                      </motion.span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="min-w-[220px]">
                        <motion.span
                          whileHover={{ scale: 1.05 }}
                          className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${
                            STATUS_STYLES[task.status] || STATUS_STYLES.pending
                          }`}
                        >
                          {formatStatusLabel(task.status)}
                        </motion.span>
                        <div className="mt-3">
                          <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                            <span className="font-medium text-slate-500">Progress</span>
                              <span className="font-semibold text-slate-700">
                              {getTaskProgressPercent(task, now)}%
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${getTaskProgressClasses(task, now)}`}
                              style={{ width: `${getTaskProgressPercent(task, now)}%` }}
                            />
                          </div>
                          <p className="mt-2 text-xs font-medium text-slate-500">
                            {getTaskTimingText(task, now)}
                          </p>
                        </div>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {tasks.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-12"
          >
            <ClipboardDocumentListIcon className="h-16 w-16 text-slate-300" />
            <p className="mt-4 text-sm text-slate-500">No tasks assigned yet</p>
            <p className="text-sm text-slate-400">Use the form above to assign your first task</p>
          </motion.div>
        )}
      </motion.section>

      <TaskDetailsModal
        task={selectedTask}
        isDarkMode={false}
        onClose={closeTaskDetails}
        onTaskUpdated={handleTaskUpdated}
      />
    </motion.div>
  );
}
