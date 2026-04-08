import Link from "next/link";

import { requireUser } from "@/lib/session";
import connectDB from "@/lib/db";
import Attendance from "@/models/Attendance";
import Task from "@/models/Task";
import User from "@/models/User";

export const metadata = {
  title: "Manager Dashboard",
};

export default async function ManagerDashboardPage() {
  const user = await requireUser("manager");

  await connectDB();

  const today = new Date();
  const todayStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);

  const [
    employeeCount,
    todayAttendance,
    assignedTasks,
  ] = await Promise.all([
    User.countDocuments({ role: "employee" }),
    Attendance.find({ date: todayStart })
      .populate("user", "name email")
      .lean(),
    Task.find({ assignedBy: user.id })
      .sort({ taskDate: 1, createdAt: -1 })
      .populate("assignedTo", "name email")
      .lean(),
  ]);

  const presentCount = todayAttendance.filter((row) => row.status === "present").length;
  const lateCount = todayAttendance.filter((row) => row.isLate).length;
  const onBreakHalfDayCount = todayAttendance.filter((row) => row.status === "half-day").length;
  const urgentTasks = assignedTasks.filter((task) => task.priority === "high" && task.status !== "completed");
  const overdueTasks = assignedTasks.filter(
    (task) => task.status !== "completed" && new Date(task.taskDate).getTime() < todayStart.getTime(),
  );

  const topEmployees = todayAttendance
    .filter((row) => row.user)
    .sort((a, b) => (b.totalWorkMinutes || 0) - (a.totalWorkMinutes || 0))
    .slice(0, 5);

  const cards = [
    { label: "Employees", value: employeeCount, tone: "text-[#A346FF]" },
    { label: "Present Today", value: presentCount, tone: "text-emerald-300" },
    { label: "Late Today", value: lateCount, tone: "text-amber-300" },
    { label: "Urgent Tasks", value: urgentTasks.length, tone: "text-rose-300" },
  ];

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-800 bg-[linear-gradient(135deg,rgba(14,165,233,0.14),rgba(15,23,42,0.95),rgba(163,70,255,0.12))] p-6 shadow-[0_24px_80px_rgba(15,23,42,0.35)]">
        <p className="text-xs uppercase tracking-[0.24em] text-[#A346FF]">Manager Analytics</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Operational pulse for today</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Track attendance issues, urgent task load, and correction requests from one place.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{card.label}</p>
              <p className={`mt-2 text-3xl font-semibold ${card.tone}`}>{card.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/manager/attendance"
            className="rounded-xl bg-gradient-to-r from-[#A346FF] to-[#A346FF] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Review Attendance
          </Link>
          <Link
            href="/manager/assign"
            className="rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-slate-600"
          >
            Assign Tasks
          </Link>
          <Link
            href="/manager/reports"
            className="rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-slate-600"
          >
            Open Reports
          </Link>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-1">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Urgent and overdue tasks</h2>
              <p className="mt-1 text-sm text-slate-400">
                {urgentTasks.length} urgent tasks, {overdueTasks.length} overdue tasks.
              </p>
            </div>
            <div className="rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-300">
              High attention
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {[...urgentTasks, ...overdueTasks.filter((task) => !urgentTasks.some((item) => String(item._id) === String(task._id)))]
              .slice(0, 6)
              .map((task) => (
                <div key={task._id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-white">{task.title}</p>
                      <p className="mt-1 text-sm text-slate-400">{task.assignedTo?.name || "Unknown employee"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-rose-500/10 px-2.5 py-1 text-rose-300">{task.priority}</span>
                      <span className="rounded-full bg-slate-800 px-2.5 py-1 text-slate-300">{task.status}</span>
                      <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-300">
                        Due {new Date(task.taskDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            {urgentTasks.length === 0 && overdueTasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 px-4 py-10 text-center text-sm text-slate-500">
                No urgent or overdue tasks right now.
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
          <h2 className="text-xl font-semibold text-white">Attendance snapshot</h2>
          <p className="mt-1 text-sm text-slate-400">
            {todayAttendance.length} records today, {onBreakHalfDayCount} half-day entries.
          </p>
          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800">
            <table className="min-w-full divide-y divide-slate-800 text-sm">
              <thead className="bg-slate-900/90 text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Employee</th>
                  <th className="px-4 py-3 text-left">Check In</th>
                  <th className="px-4 py-3 text-left">Work</th>
                  <th className="px-4 py-3 text-left">Late</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/70">
                {todayAttendance.slice(0, 8).map((row) => (
                  <tr key={row._id}>
                    <td className="px-4 py-3 text-white">{row.user?.name || "Unknown"}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {row.checkIn ? new Date(row.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{row.totalWorkMinutes || 0} mins</td>
                    <td className="px-4 py-3 text-slate-300">{row.isLate ? `${row.lateMinutes} mins` : "-"}</td>
                    <td className="px-4 py-3 text-slate-300">{row.status}</td>
                  </tr>
                ))}
                {todayAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                      No attendance records for today yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
          <h2 className="text-xl font-semibold text-white">Top work time today</h2>
          <p className="mt-1 text-sm text-slate-400">Highest worked minutes from current attendance.</p>
          <div className="mt-5 space-y-3">
            {topEmployees.map((row) => (
              <div key={row._id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{row.user?.name || "Unknown"}</p>
                    <p className="text-xs text-slate-500">{row.user?.email || "-"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-[#A346FF]">{row.totalWorkMinutes || 0}m</p>
                    <p className="text-xs text-slate-500">{row.overtimeMinutes || 0}m overtime</p>
                  </div>
                </div>
              </div>
            ))}
            {topEmployees.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 px-4 py-10 text-center text-sm text-slate-500">
                No work data available yet.
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

