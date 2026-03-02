import AttendanceReportPanel from "@/components/reports/AttendanceReportPanel";
import TaskReportPanel from "@/components/reports/TaskReportPanel";

export const metadata = {
  title: "Company Attendance Reports",
};

export default function BossReportsPage() {
  return (
    <div className="space-y-8">
      <AttendanceReportPanel title="Company Monthly Attendance Report" enableUserFilter />
      <TaskReportPanel title="Company Task Delivery Report" />
    </div>
  );
}
