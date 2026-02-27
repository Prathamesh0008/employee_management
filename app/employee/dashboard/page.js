import EmployeeTasksPanel from "@/components/tasks/EmployeeTasksPanel";
import { requireUser } from "@/lib/session";
import connectDB from "@/lib/db";
import Task from "@/models/Task";

export const metadata = {
  title: "Employee Dashboard",
};

function toPlain(value) {
  return JSON.parse(JSON.stringify(value));
}

export default async function EmployeeDashboardPage() {
  const user = await requireUser("employee");

  await connectDB();

  const tasks = await Task.find({ assignedTo: user.id })
    .sort({ taskDate: -1, createdAt: -1 })
    .populate("assignedBy", "name email role")
    .lean();

  return <EmployeeTasksPanel initialTasks={toPlain(tasks)} />;
}
