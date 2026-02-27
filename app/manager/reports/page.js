import AttendanceReportPanel from "@/components/reports/AttendanceReportPanel";

export const metadata = {
  title: "Attendance Reports",
};

export default function ManagerReportsPage() {
  return <AttendanceReportPanel title="Team Monthly Attendance Report" enableUserFilter />;
}
