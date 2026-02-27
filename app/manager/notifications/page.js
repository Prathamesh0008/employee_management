import NotificationCenterPanel from "@/components/notifications/NotificationCenterPanel";

export const metadata = {
  title: "Notifications",
};

export default function ManagerNotificationsPage() {
  return <NotificationCenterPanel title="Manager Notifications" canBroadcast managerMode />;
}
