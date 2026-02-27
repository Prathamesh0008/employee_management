import AppShell from "@/components/layout/AppShell";
import { requireUser } from "@/lib/session";

const links = [
  { label: "Dashboard", href: "/manager/dashboard", icon: "dashboard" },
  { label: "Assign Tasks", href: "/manager/assign", icon: "tasks" },
  { label: "Attendance", href: "/manager/attendance", icon: "reports" },
  { label: "Reports", href: "/manager/reports", icon: "reports" },
  { label: "Leaves", href: "/manager/leaves", icon: "tasks" },
  { label: "Notifications", href: "/manager/notifications", icon: "reports" },
  { label: "Calendar", href: "/manager/calendar", icon: "calendar" },
];

export default async function ManagerLayout({ children }) {
  const user = await requireUser("manager");

  return (
    <AppShell user={user} links={links}>
      {children}
    </AppShell>
  );
}
