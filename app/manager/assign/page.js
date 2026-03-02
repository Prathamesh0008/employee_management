import AssignTaskPanel from "@/components/tasks/AssignTaskPanel";
import { requireUser } from "@/lib/session";
import connectDB from "@/lib/db";
import Task from "@/models/Task";
import User from "@/models/User";

export const metadata = {
  title: "Assign Tasks",
};

function toPlain(value) {
  return JSON.parse(JSON.stringify(value));
}

export default async function ManagerAssignPage() {
  const user = await requireUser("manager");

  await connectDB();

  const [employees, tasks] = await Promise.all([
    User.find({ role: "employee" }, "name email role").sort({ name: 1 }).lean(),
    Task.find({ assignedBy: user.id })
      .sort({ taskDate: -1, createdAt: -1 })
      .populate("assignedTo", "name email role")
      .populate("assignedBy", "name email role")
      .populate("comments.author", "name email role")
      .lean(),
  ]);

  return <AssignTaskPanel employees={toPlain(employees)} initialTasks={toPlain(tasks)} />;
}
