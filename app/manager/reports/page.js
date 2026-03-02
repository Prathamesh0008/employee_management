import AttendanceReportPanel from "@/components/reports/AttendanceReportPanel";
import TaskReportPanel from "@/components/reports/TaskReportPanel";

export const metadata = {
  title: "Attendance Reports",
};

export default function ManagerReportsPage() {
  return (
    <div className="space-y-8">
      <AttendanceReportPanel title="Team Monthly Attendance Report" enableUserFilter />
      <TaskReportPanel title="Task Delivery Report" />
    </div>
  );
}
