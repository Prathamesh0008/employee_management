"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowPathIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  DocumentArrowDownIcon,
  ExclamationTriangleIcon,
  PresentationChartLineIcon,
} from "@heroicons/react/24/outline";

import { apiFetch } from "@/lib/client-api";

const PRIORITY_STYLES = {
  low: "bg-emerald-500/10 text-emerald-300",
  medium: "bg-amber-500/10 text-amber-300",
  high: "bg-rose-500/10 text-rose-300",
};

const STATUS_STYLES = {
  pending: "bg-slate-500/10 text-slate-200",
  "in-progress": "bg-blue-500/10 text-blue-300",
  completed: "bg-emerald-500/10 text-emerald-300",
};

export default function TaskReportPanel({ title }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const query = new URLSearchParams({
        month: String(month),
        year: String(year),
      });
      const response = await apiFetch(`/api/reports/tasks?${query.toString()}`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load task report");
      }

      setReport(data);
    } catch (loadError) {
      setError(loadError.message || "Unable to load task report");
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const csvLink = useMemo(() => {
    const query = new URLSearchParams({
      month: String(month),
      year: String(year),
    });
    return `/api/reports/tasks/export?${query.toString()}`;
  }, [month, year]);

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.35)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="inline-flex rounded-2xl bg-cyan-500/10 p-3 text-cyan-300">
            <PresentationChartLineIcon className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-white">{title}</h2>
          <p className="mt-1 text-sm text-slate-400">
            Track delivery, urgency, comments, and attachment usage.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Month</label>
            <input
              type="number"
              min={1}
              max={12}
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Year</label>
            <input
              type="number"
              min={2000}
              max={2100}
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-500"
            />
          </div>
          <button
            type="button"
            onClick={() => void loadReport()}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:border-slate-700 hover:bg-slate-800"
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <a
            href={csvLink}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-110"
          >
            <DocumentArrowDownIcon className="h-4 w-4" />
            Export CSV
          </a>
        </div>
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Total Tasks", value: report?.summary?.totalTasks || 0, icon: CalendarIcon },
          { label: "High Priority", value: report?.summary?.highPriorityTasks || 0, icon: ExclamationTriangleIcon },
          { label: "Completed", value: report?.summary?.completedTasks || 0, icon: PresentationChartLineIcon },
          { label: "Comments", value: report?.summary?.commentCount || 0, icon: ChatBubbleLeftRightIcon },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <item.icon className="h-5 w-5 text-cyan-300" />
            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
            <p className="mt-1 text-2xl font-semibold text-white">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 text-sm">
            <thead className="bg-slate-900/90 text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Task</th>
                <th className="px-4 py-3 text-left">Assigned</th>
                <th className="px-4 py-3 text-left">Due Date</th>
                <th className="px-4 py-3 text-left">Priority</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Comments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950/70">
              {(report?.tasks || []).map((task) => (
                <motion.tr key={task._id} whileHover={{ backgroundColor: "rgba(15, 23, 42, 0.9)" }}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{task.title}</p>
                    <p className="mt-1 max-w-sm truncate text-xs text-slate-500">{task.description}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    <p>{task.assignedTo?.name || "Unknown"}</p>
                    <p className="text-xs text-slate-500">{task.assignedBy?.name || "Unknown"}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {new Date(task.taskDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[task.status] || STATUS_STYLES.pending}`}>
                      {task.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{task.comments?.length || 0}</td>
                </motion.tr>
              ))}
              {!loading && (report?.tasks || []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    No task records found for this month.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
