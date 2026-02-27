"use client";

import { useMemo, useState } from "react";

const WEEK_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function isSameDate(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function SidebarCalendar() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );

  const monthLabel = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const dayCells = useMemo(() => {
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const startWeekDay = firstDay.getDay();
    const totalDays = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0,
    ).getDate();

    const cells = [];

    for (let i = 0; i < startWeekDay; i += 1) {
      cells.push(null);
    }

    for (let day = 1; day <= totalDays; day += 1) {
      cells.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
    }

    return cells;
  }, [currentMonth]);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() =>
            setCurrentMonth(
              (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
            )
          }
          className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-white"
          aria-label="Previous month"
        >
          Prev
        </button>
        <p className="text-xs font-semibold text-slate-700">{monthLabel}</p>
        <button
          type="button"
          onClick={() =>
            setCurrentMonth(
              (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
            )
          }
          className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-white"
          aria-label="Next month"
        >
          Next
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEK_DAYS.map((day, idx) => (
          <p
            key={day}
            className={`text-center text-[10px] font-semibold ${
              idx === 0 || idx === 6 ? "text-red-500" : "text-slate-500"
            }`}
          >
            {day}
          </p>
        ))}

        {dayCells.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="h-6 w-6" />;
          }

          const isToday = isSameDate(date, today);
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          return (
            <div
              key={date.toISOString()}
              className={`flex h-6 w-6 items-center justify-center rounded text-[11px] ${
                isToday && isWeekend
                  ? "bg-red-500 font-semibold text-white ring-2 ring-blue-500"
                  : isToday
                    ? "bg-indigo-600 font-semibold text-white"
                    : isWeekend
                      ? "bg-red-100 font-semibold text-red-600"
                      : "text-slate-700 hover:bg-white"
              }`}
            >
              {date.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
