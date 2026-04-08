import connectDB from "@/lib/db";
import Task from "@/models/Task";
import User from "@/models/User";

export const metadata = {
  title: "Boss Dashboard",
};

const STATUS_COLORS = {
  pending: "bg-slate-100 text-slate-700",
  "in-progress": "bg-[#A346FF]/15 text-[#A346FF]",
  completed: "bg-green-100 text-green-700",
};

export default async function BossDashboardPage() {
  await connectDB();

  const [users, tasks] = await Promise.all([
    User.find({}, "name email role createdAt").sort({ createdAt: -1 }).lean(),
    Task.find({})
      .sort({ taskDate: -1, createdAt: -1 })
      .populate("assignedTo", "name email")
      .populate("assignedBy", "name email")
      .lean(),
  ]);

  const analytics = {
    totalTasks: tasks.length,
    completedTasks: tasks.filter((task) => task.status === "completed").length,
    pendingTasks: tasks.filter((task) => task.status !== "completed").length,
  };

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold text-slate-900">Boss Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">Company overview and task analytics.</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total Tasks</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{analytics.totalTasks}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Completed</p>
          <p className="mt-1 text-2xl font-semibold text-green-600">{analytics.completedTasks}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Pending/In Progress</p>
          <p className="mt-1 text-2xl font-semibold text-amber-600">{analytics.pendingTasks}</p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Employees & Managers</h2>
        <div className="mt-4 space-y-3 md:hidden">
          {users.map((user) => (
            <div key={user._id} className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-semibold text-slate-900">{user.name}</p>
              <p className="mt-1 break-all text-xs text-slate-600">{user.email}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                <span className="capitalize">{user.role}</span>
                <span>{new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id} className="border-b border-slate-100">
                  <td className="px-3 py-2">{user.name}</td>
                  <td className="px-3 py-2">{user.email}</td>
                  <td className="px-3 py-2 capitalize">{user.role}</td>
                  <td className="px-3 py-2">{new Date(user.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">All Tasks</h2>
        <div className="mt-4 space-y-3 md:hidden">
          {tasks.map((task) => (
            <div key={task._id} className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-semibold text-slate-900">{task.title}</p>
              <p className="mt-1 text-xs text-slate-500">{task.description}</p>
              <div className="mt-2 space-y-1 text-xs text-slate-600">
                <p>Assigned To: {task.assignedTo?.name || "Unknown"}</p>
                <p>Assigned By: {task.assignedBy?.name || "Unknown"}</p>
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
                <th className="px-3 py-2">Assigned To</th>
                <th className="px-3 py-2">Assigned By</th>
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
                  <td className="px-3 py-2">{task.assignedBy?.name || "Unknown"}</td>
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

