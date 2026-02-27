import { requireUser } from "@/lib/session";
import connectDB from "@/lib/db";
import Task from "@/models/Task";

const STATUS_COLORS = {
  pending: "bg-slate-100 text-slate-700",
  "in-progress": "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
};

export const metadata = {
  title: "Manager Dashboard",
};

export default async function ManagerDashboardPage() {
  const user = await requireUser("manager");

  await connectDB();

  const tasks = await Task.find({ assignedBy: user.id })
    .sort({ taskDate: -1, createdAt: -1 })
    .populate("assignedTo", "name email")
    .lean();

  const completed = tasks.filter((task) => task.status === "completed").length;

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold text-slate-900">Manager Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">Track progress on tasks assigned by you.</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Assigned Tasks</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{tasks.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Completed</p>
          <p className="mt-1 text-2xl font-semibold text-green-600">{completed}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Pending/In Progress</p>
          <p className="mt-1 text-2xl font-semibold text-amber-600">{tasks.length - completed}</p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Tasks Assigned By You</h2>

        <div className="mt-4 space-y-3 md:hidden">
          {tasks.map((task) => (
            <div key={task._id} className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-semibold text-slate-900">{task.title}</p>
              <p className="mt-1 text-xs text-slate-500">{task.description}</p>
              <div className="mt-2 space-y-1 text-xs text-slate-600">
                <p>Employee: {task.assignedTo?.name || "Unknown"}</p>
                <p>Date: {new Date(task.taskDate).toLocaleDateString()}</p>
              </div>
              <span
                className={`mt-2 inline-block rounded px-2 py-1 text-xs font-medium ${
                  STATUS_COLORS[task.status] || STATUS_COLORS.pending
                }`}
              >
                {task.status}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Employee</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task._id} className="border-b border-slate-100">
                  <td className="px-3 py-2">
                    <p className="font-medium text-slate-900">{task.title}</p>
                    <p className="text-xs text-slate-500">{task.description}</p>
                  </td>
                  <td className="px-3 py-2">{task.assignedTo?.name || "Unknown"}</td>
                  <td className="px-3 py-2">{new Date(task.taskDate).toLocaleDateString()}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded px-2 py-1 text-xs font-medium ${
                        STATUS_COLORS[task.status] || STATUS_COLORS.pending
                      }`}
                    >
                      {task.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
