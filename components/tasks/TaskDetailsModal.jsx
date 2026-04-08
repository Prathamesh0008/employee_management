"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChatBubbleLeftRightIcon, XMarkIcon } from "@heroicons/react/24/outline";

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

const STATUS_STYLES = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "in-progress": "bg-[#A346FF]/10 text-[#A346FF] border-[#A346FF]/20",
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

function formatStatusLabel(status) {
  return String(status)
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function TaskDetailsModal({ task, isDarkMode, onClose, onTaskUpdated }) {
  const [comment, setComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const labelTextClass = isDarkMode ? "text-slate-400" : "text-slate-500";
  const mutedTextClass = isDarkMode ? "text-slate-300" : "text-slate-500";

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

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

  return (
    <AnimatePresence>
      {task ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className={`max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl shadow-2xl ${
              isDarkMode ? "border border-slate-700 bg-slate-900" : "bg-white"
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={`flex items-center justify-between border-b px-5 py-4 ${
              isDarkMode ? "border-slate-700" : "border-slate-200"
            }`}>
              <h3 className={`text-lg font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-900"}`}>
                Task Details
              </h3>
              <button
                type="button"
                onClick={onClose}
                className={`rounded-md p-1 transition-colors ${
                  isDarkMode
                    ? "text-slate-400 hover:bg-slate-800 hover:text-slate-300"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                }`}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-5 py-4">
              <div>
                <p className={`text-xs font-medium uppercase tracking-wide ${labelTextClass}`}>
                  Title
                </p>
                <p className={`mt-1 text-base font-semibold ${
                  isDarkMode ? "text-slate-200" : "text-slate-900"
                }`}>
                  {task.title}
                </p>
              </div>

              <div>
                <p className={`text-xs font-medium uppercase tracking-wide ${labelTextClass}`}>
                  Description
                </p>
                <p className={`mt-1 whitespace-pre-wrap break-words text-sm ${
                  isDarkMode ? "text-slate-300" : "text-slate-700"
                }`}>
                  {task.description || "-"}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className={`rounded-lg border p-3 ${
                  isDarkMode ? "border-slate-700 bg-slate-800/50" : "border-slate-200"
                }`}>
                  <p className={`text-xs ${labelTextClass}`}>Assigned By</p>
                  <p className={`mt-1 text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-slate-900"}`}>
                    {task.assignedBy?.name || "Unknown"}
                  </p>
                </div>
                <div className={`rounded-lg border p-3 ${
                  isDarkMode ? "border-slate-700 bg-slate-800/50" : "border-slate-200"
                }`}>
                  <p className={`text-xs ${labelTextClass}`}>Due Date</p>
                  <p className={`mt-1 text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-slate-900"}`}>
                    {new Date(task.taskDate).toLocaleDateString()}
                  </p>
                </div>
                <div className={`rounded-lg border p-3 ${
                  isDarkMode ? "border-slate-700 bg-slate-800/50" : "border-slate-200"
                }`}>
                  <p className={`text-xs ${labelTextClass}`}>Priority</p>
                  <span className={`mt-1 inline-flex rounded-full border px-2 py-1 text-xs font-medium ${
                    PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium
                  }`}>
                    {task.priority}
                  </span>
                </div>
                <div className={`rounded-lg border p-3 ${
                  isDarkMode ? "border-slate-700 bg-slate-800/50" : "border-slate-200"
                }`}>
                  <p className={`text-xs ${labelTextClass}`}>Status</p>
                  <span className={`mt-1 inline-flex rounded-full border px-2 py-1 text-xs font-medium ${
                    STATUS_STYLES[task.status] || STATUS_STYLES.pending
                  }`}>
                    {formatStatusLabel(task.status)}
                  </span>
                </div>
              </div>

              <div className={`rounded-2xl border p-4 ${
                isDarkMode ? "border-slate-700 bg-slate-800/40" : "border-slate-200 bg-slate-50/70"
              }`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className={`text-sm font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                      Task Progress
                    </h4>
                    <p className={`mt-1 text-xs ${mutedTextClass}`}>{getTaskTimingText(task, now)}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    isDarkMode ? "bg-slate-900 text-slate-300" : "bg-white text-slate-700"
                  }`}>
                    {getTaskProgressPercent(task, now)}%
                  </span>
                </div>
                <div className={`mt-3 h-2 overflow-hidden rounded-full ${
                  isDarkMode ? "bg-slate-700" : "bg-slate-200"
                }`}>
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${getTaskProgressClasses(task, now)}`}
                    style={{ width: `${getTaskProgressPercent(task, now)}%` }}
                  />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className={`rounded-lg border p-3 ${
                    isDarkMode ? "border-slate-700 bg-slate-900/60" : "border-slate-200 bg-white"
                  }`}>
                    <p className={`text-xs ${labelTextClass}`}>Started At</p>
                    <p className={`mt-1 text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-slate-900"}`}>
                      {formatTaskDateTime(task.startedAt)}
                    </p>
                  </div>
                  <div className={`rounded-lg border p-3 ${
                    isDarkMode ? "border-slate-700 bg-slate-900/60" : "border-slate-200 bg-white"
                  }`}>
                    <p className={`text-xs ${labelTextClass}`}>Completed At</p>
                    <p className={`mt-1 text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-slate-900"}`}>
                      {formatTaskDateTime(task.completedAt)}
                    </p>
                  </div>
                </div>
              </div>

              <div className={`rounded-2xl border p-4 ${
                isDarkMode ? "border-slate-700 bg-slate-800/40" : "border-slate-200 bg-slate-50/70"
              }`}>
                <div className="flex items-center gap-2">
                  <ChatBubbleLeftRightIcon className={`h-5 w-5 ${isDarkMode ? "text-[#A346FF]" : "text-[#A346FF]"}`} />
                  <h4 className={`text-sm font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                    Comments
                  </h4>
                </div>

                <div className="mt-3 space-y-3">
                  {(task.comments || []).map((entry) => (
                    <div
                      key={entry._id || `${entry.author?._id}-${entry.createdAt}`}
                      className={`rounded-xl border px-3 py-3 ${
                        isDarkMode ? "border-slate-700 bg-slate-900/70" : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className={`text-sm font-medium ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                          {entry.author?.name || "Team"}
                        </p>
                        <p className={`text-xs ${mutedTextClass}`}>
                          {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : ""}
                        </p>
                      </div>
                      <p className={`mt-2 text-sm ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                        {entry.message}
                      </p>
                    </div>
                  ))}
                  {(task.comments || []).length === 0 ? (
                    <p className={`text-sm ${mutedTextClass}`}>No comments yet.</p>
                  ) : null}
                </div>

                <div className="mt-4 space-y-3">
                  <textarea
                    rows={3}
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="Add an update or ask a question..."
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${
                      isDarkMode
                        ? "border-slate-700 bg-slate-900 text-slate-100 focus:border-[#A346FF]"
                        : "border-slate-300 bg-white text-slate-900 focus:border-[#A346FF]"
                    }`}
                  />
                  {error ? <p className="text-sm text-rose-400">{error}</p> : null}
                  <button
                    type="button"
                    onClick={() => void submitComment()}
                    disabled={submittingComment || !comment.trim()}
                    className="rounded-xl bg-gradient-to-r from-[#A346FF] to-[#A346FF] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submittingComment ? "Posting..." : "Post Comment"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

