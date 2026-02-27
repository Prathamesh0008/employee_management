import AttendanceReportPanel from "@/components/reports/AttendanceReportPanel";

export const metadata = {
  title: "Company Attendance Reports",
};

export default function BossReportsPage() {
  return <AttendanceReportPanel title="Company Monthly Attendance Report" enableUserFilter />;
}
