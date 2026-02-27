import NotificationCenterPanel from "@/components/notifications/NotificationCenterPanel";

export const metadata = {
  title: "Notifications",
};

export default function BossNotificationsPage() {
  return <NotificationCenterPanel title="Boss Notifications" canBroadcast />;
}
