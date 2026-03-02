import AppShell from "@/components/layout/AppShell";
import { requireUser } from "@/lib/session";

const links = [
  { label: "Dashboard", href: "/manager/dashboard", icon: "dashboard" },
  { label: "Assign Tasks", href: "/manager/assign", icon: "tasks" },
  { label: "Attendance", href: "/manager/attendance", icon: "reports" },
  { label: "Reports", href: "/manager/reports", icon: "reports" },
  { label: "Notifications", href: "/manager/notifications", icon: "reports" },
];

export default async function ManagerLayout({ children }) {
  const user = await requireUser("manager");

  return (
    <AppShell user={user} links={links}>
      {children}
    </AppShell>
  );
}
