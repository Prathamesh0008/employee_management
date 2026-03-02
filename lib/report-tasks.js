import Task from "@/models/Task";

export async function buildTaskReport({ role, userId = null, month, year }) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const filter = {
    taskDate: { $gte: start, $lt: end },
  };

  if (role === "manager" && userId) {
    filter.assignedBy = userId;
  }

  const tasks = await Task.find(filter)
    .sort({ taskDate: -1, createdAt: -1 })
    .populate("assignedTo", "name email role")
    .populate("assignedBy", "name email role")
    .lean();

  const summary = {
    totalTasks: tasks.length,
    completedTasks: tasks.filter((task) => task.status === "completed").length,
    inProgressTasks: tasks.filter((task) => task.status === "in-progress").length,
    pendingTasks: tasks.filter((task) => task.status === "pending").length,
    highPriorityTasks: tasks.filter((task) => task.priority === "high").length,
    commentCount: tasks.reduce((sum, task) => sum + (task.comments?.length || 0), 0),
  };

  return {
    range: { month, year, start, end },
    summary,
    tasks,
  };
}

export function taskReportToCsv(report) {
  const header = [
    "Due Date",
    "Title",
    "Assigned To",
    "Assigned By",
    "Priority",
    "Status",
    "Comments",
  ];

  const rows = report.tasks.map((task) => [
    new Date(task.taskDate).toISOString().slice(0, 10),
    task.title || "",
    task.assignedTo?.name || "",
    task.assignedBy?.name || "",
    task.priority || "",
    task.status || "",
    task.comments?.length || 0,
  ]);

  return [header, ...rows]
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");
}
