import AppShell from "@/components/layout/AppShell";
import { requireUser } from "@/lib/session";

const links = [
  { label: "Dashboard", href: "/employee/dashboard", icon: "dashboard" },
  { label: "Attendance", href: "/employee/attendance", icon: "reports" },
  { label: "Leaves", href: "/employee/leaves", icon: "tasks" },
  { label: "Notifications", href: "/employee/notifications", icon: "reports" },
  { label: "Calendar", href: "/employee/calendar", icon: "calendar" },
];

export default async function EmployeeLayout({ children }) {
  const user = await requireUser("employee");

  return (
    <AppShell user={user} links={links}>
      {children}
    </AppShell>
  );
}
