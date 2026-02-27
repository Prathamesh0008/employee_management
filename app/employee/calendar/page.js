import HolidayCalendar from "@/components/calendar/HolidayCalendar";

export const metadata = {
  title: "Holiday Calendar",
};

export default function EmployeeCalendarPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Company Holiday Calendar</h1>
      <p className="text-sm text-slate-600">Weekends and public holidays are highlighted automatically.</p>
      <HolidayCalendar />
    </div>
  );
}
