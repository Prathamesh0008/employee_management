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
  ExclamationTriangleIcon,
  EyeIcon,
  MoonIcon,
  SunIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  UserCircleIcon,
  FlagIcon,
  ChevronRightIcon,
  Squares2X2Icon,
  ListBulletIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";

const STATUS_OPTIONS = ["pending", "in-progress", "completed"];

const priorityColors = {
  low: {
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800",
    dot: "bg-emerald-500",
  },
  medium: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
    dot: "bg-amber-500",
  },
  high: {
    bg: "bg-rose-100 dark:bg-rose-900/30",
    text: "text-rose-700 dark:text-rose-400",
    border: "border-rose-200 dark:border-rose-800",
    dot: "bg-rose-500",
  },
};

const statusColors = {
  pending: {
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-700 dark:text-slate-300",
    dot: "bg-slate-400 dark:bg-slate-500",
  },
  "in-progress": {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  completed: {
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
};

function formatDate(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

export default function EmployeeTasksPanel({ initialTasks }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [error, setError] = useState("");
  const [savingTaskId, setSavingTaskId] = useState("");
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid"); // grid or list
  const [now, setNow] = useState(0);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === "completed").length;
    const inProgress = tasks.filter(t => t.status === "in-progress").length;
    const pending = tasks.filter(t => t.status === "pending").length;
    const overdue = tasks.filter(t => {
      if (t.status === "completed") return false;
      return new Date(t.taskDate) < new Date();
    }).length;

    return { total, completed, inProgress, pending, overdue };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    
    return tasks.filter(task => {
      if (statusFilter !== "all" && task.status !== statusFilter) return false;
      if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
      if (query) {
        return task.title.toLowerCase().includes(query) || 
               task.description?.toLowerCase().includes(query) ||
               task.assignedBy?.name?.toLowerCase().includes(query);
      }
      return true;
    });
  }, [tasks, statusFilter, priorityFilter, searchQuery]);

  const groupedByDate = useMemo(() => {
    const groups = {};
    
    filteredTasks.forEach(task => {
      const date = new Date(task.taskDate).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(task);
    });
    
    return Object.entries(groups).sort((a, b) => new Date(a[0]) - new Date(b[0]));
  }, [filteredTasks]);

  const updateTaskStatus = async (taskId, newStatus) => {
    setSavingTaskId(taskId);
    try {
      const response = await apiFetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (response.ok) {
        const { task } = await response.json();
        setTasks(prev => prev.map(t => t._id === taskId ? task : t));
      }
    } catch (error) {
      console.error("Failed to update task:", error);
    } finally {
      setSavingTaskId("");
    }
  };

  const TaskCard = ({ task }) => {
    const isOverdue = !task.completed && new Date(task.taskDate) < new Date();
    const priority = priorityColors[task.priority];
    const status = statusColors[task.status];
    
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        whileHover={{ y: -4 }}
        className={`
          group relative rounded-xl border p-5 transition-all cursor-pointer
          ${isDarkMode 
            ? 'bg-slate-800/50 border-slate-700 hover:border-slate-600 hover:bg-slate-800' 
            : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-lg'
          }
          ${isOverdue && !task.completed && 'border-l-4 border-l-rose-500'}
        `}
        onClick={() => setSelectedTask(task)}
      >
        {/* Priority indicator */}
        <div className={`absolute top-5 right-5 w-2 h-2 rounded-full ${priority.dot}`} />

        <div className="flex items-start gap-4">
          {/* Status checkbox */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              const newStatus = task.status === 'completed' ? 'pending' : 'completed';
              updateTaskStatus(task._id, newStatus);
            }}
            className="mt-1"
          >
            {task.status === 'completed' ? (
              <CheckCircleSolid className="h-5 w-5 text-emerald-500" />
            ) : (
              <div className={`
                h-5 w-5 rounded-full border-2 transition-colors
                ${isDarkMode ? 'border-slate-600' : 'border-slate-300'}
                hover:border-emerald-500
              `} />
            )}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className={`
              text-base font-medium mb-1 truncate
              ${task.status === 'completed' 
                ? 'line-through text-slate-400 dark:text-slate-500' 
                : isDarkMode ? 'text-white' : 'text-slate-900'
              }
            `}>
              {task.title}
            </h3>
            
            {task.description && (
              <p className={`
                text-sm mb-3 line-clamp-2
                ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}
              `}>
                {task.description}
              </p>
            )}

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div className="flex items-center gap-1.5">
                <UserCircleIcon className={`h-4 w-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>
                  {task.assignedBy?.name || 'Unassigned'}
                </span>
              </div>
              
              <div className="flex items-center gap-1.5">
                <CalendarIcon className={`h-4 w-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                <span className={`
                  ${isOverdue && !task.completed 
                    ? 'text-rose-500 dark:text-rose-400 font-medium' 
                    : isDarkMode ? 'text-slate-300' : 'text-slate-700'
                  }
                `}>
                  {formatDate(task.taskDate)}
                </span>
              </div>

              <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${priority.bg} ${priority.text}`}>
                {task.priority}
              </div>

              <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                {task.status}
              </div>
            </div>

            {/* Progress for in-progress tasks */}
            {task.status === 'in-progress' && shouldShowTaskProgress(task) && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Progress</span>
                  <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>
                    {getTaskProgressPercent(task, now)}%
                  </span>
                </div>
                <div className={`h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getTaskProgressClasses(task, now)}`}
                    style={{ width: `${getTaskProgressPercent(task, now)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className={`
      min-h-screen transition-colors duration-300
      ${isDarkMode ? 'dark bg-slate-950' : 'bg-slate-50'}
    `}>
      {/* Header */}
      <header className={`
        sticky top-0 z-20 border-b backdrop-blur-sm
        ${isDarkMode 
          ? 'bg-slate-950/80 border-slate-800' 
          : 'bg-white/80 border-slate-200'
        }
      `}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`
                p-2 rounded-xl
                ${isDarkMode ? 'bg-blue-600' : 'bg-blue-500'}
              `}>
                <CheckCircleIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Tasks
                </h1>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {filteredTasks.length} tasks • {stats.completed} completed
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className={`
                flex rounded-lg p-0.5
                ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}
              `}>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`
                    p-2 rounded-md transition-colors
                    ${viewMode === 'grid'
                      ? isDarkMode ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 shadow-sm'
                      : isDarkMode ? 'text-slate-400' : 'text-slate-500'
                    }
                  `}
                >
                  <Squares2X2Icon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`
                    p-2 rounded-md transition-colors
                    ${viewMode === 'list'
                      ? isDarkMode ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 shadow-sm'
                      : isDarkMode ? 'text-slate-400' : 'text-slate-500'
                    }
                  `}
                >
                  <ListBulletIcon className="h-4 w-4" />
                </button>
              </div>

              {/* Theme toggle */}
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`
                  p-2 rounded-lg transition-colors
                  ${isDarkMode 
                    ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }
                `}
              >
                {isDarkMode ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Attendance */}
        <div className="mb-8">
          <EmployeeDashboardAttendanceSection />
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total', value: stats.total, color: 'blue' },
            { label: 'In Progress', value: stats.inProgress, color: 'amber' },
            { label: 'Pending', value: stats.pending, color: 'slate' },
            { label: 'Completed', value: stats.completed, color: 'emerald' },
            { label: 'Overdue', value: stats.overdue, color: 'rose' },
          ].map(stat => (
            <div key={stat.label} className={`
              rounded-lg p-3
              ${isDarkMode ? 'bg-slate-800/50' : 'bg-white'}
            `}>
              <p className={`text-xs mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {stat.label}
              </p>
              <p className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Search and filters */}
        <div className="mb-6 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className={`
                absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4
                ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}
              `} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className={`
                  w-full pl-9 pr-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2
                  ${isDarkMode 
                    ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20' 
                    : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-200'
                  }
                `}
              />
            </div>
            
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className={`
                lg:hidden px-3 py-2 rounded-lg border
                ${isDarkMode 
                  ? 'bg-slate-800 border-slate-700 text-slate-300' 
                  : 'bg-white border-slate-200 text-slate-700'
                }
              `}
            >
              <FunnelIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Filters - desktop */}
          <div className="hidden lg:flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`
                px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2
                ${isDarkMode 
                  ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500 focus:ring-blue-500/20' 
                  : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-blue-200'
                }
              `}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className={`
                px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2
                ${isDarkMode 
                  ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500 focus:ring-blue-500/20' 
                  : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-blue-200'
                }
              `}
            >
              <option value="all">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          {/* Filters - mobile */}
          <AnimatePresence>
            {showMobileFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="lg:hidden space-y-2 overflow-hidden"
              >
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`
                    w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2
                    ${isDarkMode 
                      ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500 focus:ring-blue-500/20' 
                      : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-blue-200'
                    }
                  `}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>

                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className={`
                    w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2
                    ${isDarkMode 
                      ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500 focus:ring-blue-500/20' 
                      : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-blue-200'
                    }
                  `}
                >
                  <option value="all">All Priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tasks */}
        {filteredTasks.length === 0 ? (
          <div className={`
            text-center py-16 rounded-xl border-2 border-dashed
            ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}
          `}>
            <CheckCircleIcon className={`
              h-12 w-12 mx-auto mb-3
              ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}
            `} />
            <h3 className={`text-lg font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              No tasks found
            </h3>
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'You don\'t have any tasks yet'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          // Grid view - grouped by date
          <div className="space-y-6">
            {groupedByDate.map(([date, tasks]) => (
              <div key={date}>
                <h2 className={`
                  text-sm font-medium mb-3 px-1
                  ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}
                `}>
                  {formatDate(date)}
                  <span className="ml-2 text-xs">
                    ({tasks.length} {tasks.length === 1 ? 'task' : 'tasks'})
                  </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <AnimatePresence mode="popLayout">
                    {tasks.map(task => (
                      <TaskCard key={task._id} task={task} />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // List view
          <div className={`
            rounded-xl border overflow-hidden
            ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}
          `}>
            <table className="w-full">
              <thead className={isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium w-8"></th>
                  <th className="px-4 py-3 text-left text-xs font-medium">Task</th>
                  <th className="px-4 py-3 text-left text-xs font-medium">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium">Due</th>
                  <th className="px-4 py-3 text-right text-xs font-medium">Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-slate-200'}`}>
                <AnimatePresence>
                  {filteredTasks.map(task => (
                    <motion.tr
                      key={task._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`
                        cursor-pointer transition-colors
                        ${isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}
                      `}
                      onClick={() => setSelectedTask(task)}
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newStatus = task.status === 'completed' ? 'pending' : 'completed';
                            updateTaskStatus(task._id, newStatus);
                          }}
                        >
                          {task.status === 'completed' ? (
                            <CheckCircleSolid className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <div className={`
                              h-5 w-5 rounded-full border-2
                              ${isDarkMode ? 'border-slate-600' : 'border-slate-300'}
                            `} />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className={`text-xs truncate max-w-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              {task.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[task.priority].bg} ${priorityColors[task.priority].text}`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[task.status].bg} ${statusColors[task.status].text}`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                          {formatDate(task.taskDate)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ChevronRightIcon className={`h-5 w-5 inline-block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </main>

      <TaskDetailsModal
        task={selectedTask}
        isDarkMode={isDarkMode}
        onClose={() => setSelectedTask(null)}
        onTaskUpdated={(updatedTask) => {
          setTasks(prev => prev.map(t => t._id === updatedTask._id ? updatedTask : t));
        }}
      />
    </div>
  );
}