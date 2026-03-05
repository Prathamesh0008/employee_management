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
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  "in-progress": "bg-blue-500/10 text-blue-400 border-blue-500/30",
  completed: "bg-green-500/10 text-green-400 border-green-500/30",
};

const PRIORITY_STYLES = {
  low: "bg-green-500/10 text-green-400 border-green-500/30",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  high: "bg-red-500/10 text-red-400 border-red-500/30",
};

function formatStatusLabel(status) {
  return String(status)
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function truncateWords(text, maxWords = 2) {
  const words = String(text || "").split(" ");
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ") + "...";
}

export default function EmployeeTasksPanel({ initialTasks }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedTask, setSelectedTask] = useState(null);
  const [savingTaskId, setSavingTaskId] = useState("");
  const [taskSearch, setTaskSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [now, setNow] = useState(Date.now());

  const [selectedStatus, setSelectedStatus] = useState(() => {
    const map = {};
    initialTasks.forEach((t) => (map[t._id] = t.status));
    return map;
  });

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const loadTasks = useCallback(async () => {
    const res = await apiFetch("/api/tasks?limit=200");
    const data = await res.json();
    if (data.tasks) setTasks(data.tasks);
  }, []);

  useEffect(() => {
    const interval = setInterval(loadTasks, AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [loadTasks]);

  const counts = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const pending = total - completed;
    return { total, completed, pending };
  }, [tasks]);

  const completionRate = useMemo(() => {
    if (counts.total === 0) return 0;
    return Math.round((counts.completed / counts.total) * 100);
  }, [counts]);

  const filteredTasks = useMemo(() => {
    const search = taskSearch.toLowerCase();

    return tasks.filter((task) => {
      const matchSearch =
        !search ||
        task.title.toLowerCase().includes(search) ||
        task.description?.toLowerCase().includes(search);

      const matchStatus =
        statusFilter === "all" || task.status === statusFilter;

      const matchPriority =
        priorityFilter === "all" || task.priority === priorityFilter;

      return matchSearch && matchStatus && matchPriority;
    });
  }, [tasks, taskSearch, statusFilter, priorityFilter]);

  const updateTask = async (taskId) => {
    const status = selectedStatus[taskId];
    setSavingTaskId(taskId);

    try {
      const res = await apiFetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();

      if (data.task) {
        setTasks((prev) =>
          prev.map((t) => (t._id === data.task._id ? data.task : t))
        );
      }
    } finally {
      setSavingTaskId("");
    }
  };

  const shell = `
  min-h-screen
  bg-[radial-gradient(circle_at_top,_#0f172a,_#020617)]
  text-gray-200
  px-6
  py-10
  `;

  const panel = `
  rounded-2xl
  border border-slate-700/60
  bg-slate-900/60
  backdrop-blur-xl
  shadow-xl
  `;

  return (
    <div className={shell}>
      {/* Header */}
      <div className={`${panel} p-6 mb-8 flex justify-between items-center`}>
        <div>
          <h1 className="text-3xl font-bold">Employee Task Dashboard</h1>
          <p className="text-gray-400 text-sm">
            Track progress and manage your tasks
          </p>
        </div>

        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700"
        >
          {isDarkMode ? (
            <SunIcon className="h-5 w-5 text-yellow-400" />
          ) : (
            <MoonIcon className="h-5 w-5 text-blue-400" />
          )}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        {[
          {
            label: "Total Tasks",
            value: counts.total,
            icon: ChartBarIcon,
          },
          {
            label: "Completed",
            value: counts.completed,
            icon: CheckCircleIcon,
          },
          {
            label: "Pending",
            value: counts.pending,
            icon: ClockIcon,
          },
          {
            label: "Completion Rate",
            value: completionRate + "%",
            icon: FunnelIcon,
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-lg"
          >
            <card.icon className="h-6 w-6 text-blue-400 mb-2" />
            <p className="text-sm text-gray-400">{card.label}</p>
            <p className="text-3xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className={`${panel} p-5 mb-6`}>
        <div className="grid md:grid-cols-4 gap-4">
          <input
            value={taskSearch}
            onChange={(e) => setTaskSearch(e.target.value)}
            placeholder="Search tasks..."
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2"
          >
            <option value="all">All Status</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {formatStatusLabel(s)}
              </option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2"
          >
            <option value="all">All Priority</option>
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {formatStatusLabel(p)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Task Table */}
      <div className={`${panel} overflow-hidden`}>
        <table className="w-full text-sm">
          <thead className="bg-slate-950 text-gray-400 uppercase text-xs">
            <tr>
              <th className="px-6 py-4 text-left">Task</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Priority</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredTasks.map((task) => (
              <tr
                key={task._id}
                className="border-t border-slate-800 hover:bg-slate-800/40"
              >
                <td className="px-6 py-4">
                  <div className="font-medium">{task.title}</div>
                  <div className="text-gray-400 text-xs">
                    {truncateWords(task.description)}
                  </div>
                </td>

                <td className="px-6 py-4">
                  {new Date(task.taskDate).toLocaleDateString()}
                </td>

                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs border ${
                      PRIORITY_STYLES[task.priority]
                    }`}
                  >
                    {task.priority}
                  </span>
                </td>

                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs border ${
                      STATUS_STYLES[task.status]
                    }`}
                  >
                    {formatStatusLabel(task.status)}
                  </span>
                </td>

                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <select
                      value={selectedStatus[task._id]}
                      onChange={(e) =>
                        setSelectedStatus((prev) => ({
                          ...prev,
                          [task._id]: e.target.value,
                        }))
                      }
                      className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {formatStatusLabel(s)}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => updateTask(task._id)}
                      className="bg-gradient-to-r from-blue-500 to-cyan-500 px-3 py-1 rounded text-white text-xs"
                    >
                      {savingTaskId === task._id ? "Saving..." : "Save"}
                    </button>

                    <button
                      onClick={() => setSelectedTask(task)}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TaskDetailsModal
        task={selectedTask}
        isDarkMode={isDarkMode}
        onClose={() => setSelectedTask(null)}
      />
    </div>
  );
}