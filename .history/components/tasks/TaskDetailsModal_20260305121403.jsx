"use client";

import { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { 
  ChatBubbleLeftRightIcon, 
  XMarkIcon,
  PaperAirplaneIcon,
  UserCircleIcon,
  CalendarIcon,
  ClockIcon,
  FlagIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";

import { apiFetch } from "@/lib/client-api";
import {
  formatTaskDateTime,
  getTaskProgressClasses,
  getTaskProgressPercent,
  getTaskTimingText,
} from "@/lib/task-progress";

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

const STATUS_STYLES = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "in-progress": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const STATUS_ICONS = {
  pending: "⏳",
  "in-progress": "🔄",
  completed: "✅",
};

function formatStatusLabel(status) {
  return String(status)
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatRelativeTime(dateString) {
  if (!dateString) return "Not set";
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  
  return date.toLocaleDateString();
}

export default function TaskDetailsModal({ task, isDarkMode, onClose, onTaskUpdated }) {
  const [comment, setComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [isEditing, setIsEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState("");
  const [savingDescription, setSavingDescription] = useState(false);
  
  const commentsEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (task) {
      setEditedDescription(task.description || "");
    }
  }, [task]);

  // Auto-scroll to bottom of comments
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [task?.comments]);

  // Auto-focus textarea when modal opens
  useEffect(() => {
    if (task) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 300);
    }
  }, [task]);

  const submitComment = async () => {
    const message = comment.trim();

    if (!message) {
      return;
    }

    setSubmittingComment(true);
    setError("");

    try {
      const response = await apiFetch(`/api/tasks/${task._id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add comment");
      }

      setComment("");
      onTaskUpdated?.(data.task);
    } catch (commentError) {
      setError(commentError.message || "Unable to add comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitComment();
    }
  };

  const saveDescription = async () => {
    if (editedDescription === task.description) {
      setIsEditing(false);
      return;
    }

    setSavingDescription(true);
    setError("");

    try {
      const response = await apiFetch(`/api/tasks/${task._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: editedDescription }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update description");
      }

      onTaskUpdated?.(data.task);
      setIsEditing(false);
    } catch (err) {
      setError(err.message || "Unable to update description");
    } finally {
      setSavingDescription(false);
    }
  };

  if (!task) return null;

  const DetailItem = ({ icon: Icon, label, value, children }) => (
    <div className={`
      rounded-xl border p-4 transition-all hover:shadow-md
      ${isDarkMode 
        ? "border-slate-700 bg-slate-800/50 hover:bg-slate-800" 
        : "border-slate-200 bg-white hover:bg-slate-50"
      }
    `}>
      <div className="flex items-start gap-3">
        <div className={`
          rounded-lg p-2
          ${isDarkMode ? "bg-slate-700" : "bg-slate-100"}
        `}>
          <Icon className={`h-4 w-4 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`} />
        </div>
        <div className="flex-1">
          <p className={`text-xs font-medium ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
            {label}
          </p>
          <div className={`mt-1 text-sm ${isDarkMode ? "text-slate-200" : "text-slate-900"}`}>
            {children || value || "—"}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className={`
            max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-2xl shadow-2xl
            ${isDarkMode 
              ? "border border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950" 
              : "bg-white"
            }
          `}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`
            sticky top-0 z-10 flex items-center justify-between border-b px-6 py-4
            ${isDarkMode 
              ? "border-slate-700 bg-slate-900/95 backdrop-blur-sm" 
              : "border-slate-200 bg-white/95 backdrop-blur-sm"
            }
          `}>
            <div className="flex items-center gap-3">
              <div className={`
                rounded-xl p-2
                ${PRIORITY_STYLES[task.priority]}
              `}>
                <span className="text-lg">{PRIORITY_ICONS[task.priority]}</span>
              </div>
              <div>
                <h3 className={`text-lg font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-900"}`}>
                  {task.title}
                </h3>
                <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                  Task ID: {task._id.slice(-8)}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`
                rounded-lg p-2 transition-all hover:scale-110
                ${isDarkMode
                  ? "text-slate-400 hover:bg-slate-800 hover:text-slate-300"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                }
              `}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto px-6 py-5" style={{ maxHeight: "calc(85vh - 80px)" }}>
            <div className="space-y-6">
              {/* Description Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className={`text-sm font-semibold ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                    Description
                  </h4>
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className={`
                        flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-colors
                        ${isDarkMode 
                          ? "text-slate-400 hover:bg-slate-800" 
                          : "text-slate-500 hover:bg-slate-100"
                        }
                      `}
                    >
                      <PencilIcon className="h-3 w-3" />
                      Edit
                    </button>
                  ) : null}
                </div>
                
                {isEditing ? (
                  <div className="space-y-3">
                    <textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      rows={4}
                      className={`
                        w-full rounded-xl border px-4 py-3 text-sm transition-all
                        focus:outline-none focus:ring-2
                        ${isDarkMode
                          ? "border-slate-700 bg-slate-800 text-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                          : "border-slate-300 bg-white text-slate-900 focus:border-blue-500 focus:ring-blue-200"
                        }
                      `}
                      placeholder="Add a description..."
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setEditedDescription(task.description || "");
                        }}
                        className={`
                          rounded-lg px-3 py-1.5 text-xs font-medium transition-colors
                          ${isDarkMode
                            ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }
                        `}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveDescription}
                        disabled={savingDescription}
                        className={`
                          rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors
                          ${isDarkMode
                            ? "bg-blue-600 hover:bg-blue-700"
                            : "bg-blue-500 hover:bg-blue-600"
                          }
                          disabled:opacity-50
                        `}
                      >
                        {savingDescription ? (
                          <ArrowPathIcon className="h-3 w-3 animate-spin" />
                        ) : (
                          "Save"
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className={`
                    whitespace-pre-wrap break-words rounded-xl border p-4 text-sm leading-relaxed
                    ${isDarkMode 
                      ? "border-slate-700 bg-slate-800/50 text-slate-300" 
                      : "border-slate-200 bg-slate-50 text-slate-700"
                    }
                  `}>
                    {task.description || "No description provided."}
                  </p>
                )}
              </div>

              {/* Details Grid */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <DetailItem icon={UserCircleIcon} label="Assigned By" value={task.assignedBy?.name || "Unknown"} />
                <DetailItem icon={CalendarIcon} label="Due Date">
                  <div className="flex items-center gap-1">
                    <span>{new Date(task.taskDate).toLocaleDateString()}</span>
                    <span className={`text-xs ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                      ({formatRelativeTime(task.taskDate)})
                    </span>
                  </div>
                </DetailItem>
                <DetailItem icon={FlagIcon} label="Priority">
                  <span className={`
                    inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium
                    ${PRIORITY_STYLES[task.priority]}
                  `}>
                    {PRIORITY_ICONS[task.priority]} {task.priority}
                  </span>
                </DetailItem>
                <DetailItem icon={CheckCircleIcon} label="Status">
                  <span className={`
                    inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium
                    ${STATUS_STYLES[task.status]}
                  `}>
                    {STATUS_ICONS[task.status]} {formatStatusLabel(task.status)}
                  </span>
                </DetailItem>
              </div>

              {/* Progress Section */}
              <div className={`
                rounded-2xl border p-5
                ${isDarkMode 
                  ? "border-slate-700 bg-gradient-to-br from-slate-800/50 to-slate-900/50" 
                  : "border-slate-200 bg-gradient-to-br from-slate-50 to-white"
                }
              `}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClockIcon className={`h-5 w-5 ${isDarkMode ? "text-blue-400" : "text-blue-500"}`} />
                    <h4 className={`font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-900"}`}>
                      Task Progress
                    </h4>
                  </div>
                  <span className={`
                    rounded-full px-3 py-1 text-sm font-semibold
                    ${isDarkMode ? "bg-slate-800 text-blue-400" : "bg-blue-50 text-blue-600"}
                  `}>
                    {getTaskProgressPercent(task, now)}%
                  </span>
                </div>

                <p className={`mt-2 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  {getTaskTimingText(task, now)}
                </p>

                <div className={`mt-4 h-2.5 overflow-hidden rounded-full ${
                  isDarkMode ? "bg-slate-700" : "bg-slate-200"
                }`}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${getTaskProgressPercent(task, now)}%` }}
                    transition={{ duration: 0.5 }}
                    className={`h-full rounded-full bg-gradient-to-r ${getTaskProgressClasses(task, now)}`}
                  />
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className={`
                    rounded-xl border p-3
                    ${isDarkMode ? "border-slate-700 bg-slate-900/60" : "border-slate-200 bg-white"}
                  `}>
                    <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>Started At</p>
                    <p className={`mt-1 text-sm font-medium flex items-center gap-1 ${
                      isDarkMode ? "text-slate-200" : "text-slate-900"
                    }`}>
                      <span>🚀</span> {formatTaskDateTime(task.startedAt) || "Not started"}
                    </p>
                  </div>
                  <div className={`
                    rounded-xl border p-3
                    ${isDarkMode ? "border-slate-700 bg-slate-900/60" : "border-slate-200 bg-white"}
                  `}>
                    <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>Completed At</p>
                    <p className={`mt-1 text-sm font-medium flex items-center gap-1 ${
                      isDarkMode ? "text-slate-200" : "text-slate-900"
                    }`}>
                      <span>✅</span> {formatTaskDateTime(task.completedAt) || "Not completed"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Comments Section */}
              <div className={`
                rounded-2xl border p-5
                ${isDarkMode 
                  ? "border-slate-700 bg-gradient-to-br from-slate-800/50 to-slate-900/50" 
                  : "border-slate-200 bg-gradient-to-br from-slate-50 to-white"
                }
              `}>
                <div className="flex items-center gap-2">
                  <ChatBubbleLeftRightIcon className={`h-5 w-5 ${isDarkMode ? "text-blue-400" : "text-blue-500"}`} />
                  <h4 className={`font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-900"}`}>
                    Comments
                  </h4>
                  <span className={`
                    ml-auto rounded-full px-2 py-0.5 text-xs
                    ${isDarkMode ? "bg-slate-700 text-slate-300" : "bg-slate-200 text-slate-600"}
                  `}>
                    {(task.comments || []).length}
                  </span>
                </div>

                {/* Comments List */}
                <div className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-2">
                  {(task.comments || []).length > 0 ? (
                    (task.comments || []).map((entry, index) => (
                      <motion.div
                        key={entry._id || `${entry.author?._id}-${entry.createdAt}-${index}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`
                          rounded-xl border p-4 transition-all hover:shadow-md
                          ${isDarkMode 
                            ? "border-slate-700 bg-slate-900/70 hover:bg-slate-900" 
                            : "border-slate-200 bg-white hover:bg-slate-50"
                          }
                        `}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className={`
                              flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium
                              ${isDarkMode ? "bg-blue-500/20 text-blue-300" : "bg-blue-100 text-blue-600"}
                            `}>
                              {entry.author?.name?.charAt(0) || "U"}
                            </div>
                            <p className={`text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-slate-900"}`}>
                              {entry.author?.name || "Team Member"}
                            </p>
                          </div>
                          <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                            {entry.createdAt ? (
                              <span title={new Date(entry.createdAt).toLocaleString()}>
                                {formatRelativeTime(entry.createdAt)}
                              </span>
                            ) : ""}
                          </p>
                        </div>
                        <p className={`mt-2 text-sm leading-relaxed ${
                          isDarkMode ? "text-slate-300" : "text-slate-700"
                        }`}>
                          {entry.message}
                        </p>
                      </motion.div>
                    ))
                  ) : (
                    <div className={`
                      flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center
                      ${isDarkMode ? "border-slate-700" : "border-slate-200"}
                    `}>
                      <ChatBubbleLeftRightIcon className={`h-8 w-8 ${isDarkMode ? "text-slate-600" : "text-slate-400"}`} />
                      <p className={`mt-2 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                        No comments yet
                      </p>
                      <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                        Be the first to add a comment
                      </p>
                    </div>
                  )}
                  <div ref={commentsEndRef} />
                </div>

                {/* Comment Input */}
                <div className="mt-4 space-y-3">
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      rows={2}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Add a comment... (Press Enter to submit)"
                      className={`
                        w-full rounded-xl border px-4 py-3 pr-12 text-sm transition-all
                        focus:outline-none focus:ring-2
                        ${isDarkMode
                          ? "border-slate-700 bg-slate-900 text-slate-200 placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
                          : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-200"
                        }
                      `}
                    />
                    <button
                      onClick={submitComment}
                      disabled={submittingComment || !comment.trim()}
                      className={`
                        absolute bottom-3 right-3 rounded-lg p-2 transition-all
                        ${comment.trim() 
                          ? isDarkMode
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "bg-blue-500 text-white hover:bg-blue-600"
                          : isDarkMode
                            ? "bg-slate-800 text-slate-500"
                            : "bg-slate-100 text-slate-400"
                        }
                        disabled:cursor-not-allowed
                      `}
                      title="Send comment"
                    >
                      {submittingComment ? (
                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      ) : (
                        <PaperAirplaneIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  
                  {error && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm text-rose-400"
                    >
                      {error}
                    </motion.p>
                  )}
                  
                  <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                    Press Enter to submit, Shift + Enter for new line
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}