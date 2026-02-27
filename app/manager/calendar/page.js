import HolidayCalendar from "@/components/calendar/HolidayCalendar";

export const metadata = {
  title: "Holiday Calendar",
};

export default function ManagerCalendarPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Company Holiday Calendar</h1>
      <p className="text-sm text-slate-600">View weekends and public holidays for any month/year.</p>
      <HolidayCalendar />
    </div>
  );
}
