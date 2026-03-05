import AppShell from "@/components/layout/AppShell";
import { requireUser } from "@/lib/session";

const links = [
  { label: "Dashboard", href: "/boss/dashboard", icon: "dashboard" },
  { label: "Users", href: "/boss/users", icon: "tasks" },
  { label: "Attendance", href: "/boss/attendance", icon: "reports" },
  { label: "Reimbursements", href: "/boss/reimbursements", icon: "currency" },
  { label: "Reports", href: "/boss/reports", icon: "reports" },
  { label: "Notifications", href: "/boss/notifications", icon: "reports" },
  { label: "Holidays", href: "/boss/holidays", icon: "calendar" },
];

export default async function BossLayout({ children }) {
  const user = await requireUser("boss");

  return (
    <AppShell user={user} links={links}>
      {children}
    </AppShell>
  );
}
