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
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-3 shadow-[inset_0_1px_0_rgba(148,163,184,0.08)]">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() =>
            setCurrentMonth(
              (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
            )
          }
          className="rounded-lg border border-slate-700 bg-slate-950/80 px-2 py-1 text-xs text-slate-300 transition hover:border-[#A346FF]/40 hover:bg-slate-900"
          aria-label="Previous month"
        >
          Prev
        </button>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">{monthLabel}</p>
        <button
          type="button"
          onClick={() =>
            setCurrentMonth(
              (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
            )
          }
          className="rounded-lg border border-slate-700 bg-slate-950/80 px-2 py-1 text-xs text-slate-300 transition hover:border-[#A346FF]/40 hover:bg-slate-900"
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
              idx === 0 || idx === 6 ? "text-rose-400" : "text-slate-500"
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
                  ? "bg-rose-500 font-semibold text-white ring-2 ring-[#A346FF]"
                  : isToday
                    ? "bg-gradient-to-r from-[#A346FF] to-[#A346FF] font-semibold text-white"
                    : isWeekend
                      ? "bg-rose-500/10 font-semibold text-rose-300"
                      : "text-slate-300 hover:bg-slate-800"
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

