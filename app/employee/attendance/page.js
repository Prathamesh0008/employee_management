import EmployeeDashboardAttendanceSection from "@/components/attendance/EmployeeDashboardAttendanceSection";
import EmployeeAttendancePanel from "@/components/attendance/EmployeeAttendancePanel";

export const metadata = {
  title: "My Attendance",
};

export default function EmployeeAttendancePage() {
  return (
    <div className="space-y-6">
      <EmployeeDashboardAttendanceSection />
      <EmployeeAttendancePanel hideControls />
    </div>
  );
}
