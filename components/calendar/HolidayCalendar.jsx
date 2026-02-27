"use client";

import { apiFetch } from "@/lib/client-api";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  SunIcon,
  MoonIcon,
  SparklesIcon,
  XMarkIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

function toDateKey(date) {
  return format(date, "yyyy-MM-dd");
}

function parseDateOnly(value) {
  if (!value) {
    return null;
  }

  const text = String(value);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function HolidayDetailModal({ item, onClose }) {
  if (!item) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm"
        onClick={onClose}
        role="presentation"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {/* Modal Header */}
          <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-amber-50 to-orange-50 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-100 p-2">
                <CalendarIcon className="h-5 w-5 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Holiday Details</h3>
            </div>
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 hover:bg-slate-100"
            >
              <XMarkIcon className="h-5 w-5 text-slate-500" />
            </motion.button>
          </div>

          {/* Modal Content */}
          <div className="p-6">
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="mb-4 flex items-center gap-2 text-sm text-slate-600"
            >
              <CalendarIcon className="h-4 w-4 text-amber-500" />
              <span className="font-medium">{format(item.date, "EEEE, MMMM d, yyyy")}</span>
            </motion.div>

            <div className="space-y-4">
              {item.isWeekend ? (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-slate-200 p-2">
                      <MoonIcon className="h-4 w-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">Weekend Holiday</p>
                      <p className="text-sm text-slate-600">
                        Automatically detected (Saturday/Sunday)
                      </p>
                    </div>
                  </div>
                </motion.div>
              ) : null}

              {item.publicHolidays.map((holiday, index) => (
                <motion.div
                  key={holiday._id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-amber-200 p-2">
                      <SunIcon className="h-4 w-4 text-amber-700" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-amber-800">{holiday.title}</p>
                      {holiday.description ? (
                        <p className="mt-1 text-sm text-amber-700">{holiday.description}</p>
                      ) : (
                        <p className="mt-1 text-sm text-amber-600 italic">
                          No description provided.
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Footer */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-6 flex justify-end"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
              >
                Close
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.1,
    },
  },
};

const dayVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 20,
    },
  },
  hover: {
    scale: 1.02,
    y: -2,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25,
    },
  },
  tap: { scale: 0.98 },
};

export default function HolidayCalendar({ refreshKey = 0, onMonthChange }) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(today));
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const currentMonthNumber = currentMonth.getMonth() + 1;
  const currentYear = currentMonth.getFullYear();

  const yearOptions = useMemo(() => {
    const options = [];
    const center = new Date().getFullYear();

    for (let year = center - 5; year <= center + 5; year += 1) {
      options.push(year);
    }

    if (!options.includes(currentYear)) {
      options.push(currentYear);
      options.sort((a, b) => a - b);
    }

    return options;
  }, [currentYear]);

  useEffect(() => {
    onMonthChange?.({ month: currentMonthNumber, year: currentYear });
  }, [currentMonthNumber, currentYear, onMonthChange]);

  useEffect(() => {
    const controller = new AbortController();

    const loadHolidays = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await apiFetch(
          `/api/holidays?month=${currentMonthNumber}&year=${currentYear}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Failed to fetch holidays");
          return;
        }

        setHolidays(data.holidays || []);
      } catch (fetchError) {
        if (fetchError.name !== "AbortError") {
          setError("Unable to load holidays");
        }
      } finally {
        setLoading(false);
      }
    };

    loadHolidays();

    return () => controller.abort();
  }, [currentMonthNumber, currentYear, refreshKey]);

  const holidayMap = useMemo(() => {
    const map = new Map();

    for (const holiday of holidays) {
      const parsedDate = parseDateOnly(holiday.date);
      if (!parsedDate) {
        continue;
      }

      const key = toDateKey(parsedDate);
      const existing = map.get(key) || [];
      existing.push(holiday);
      map.set(key, existing);
    }

    return map;
  }, [holidays]);

  const days = useMemo(() => {
    const firstMonthDay = startOfMonth(currentMonth);
    const lastMonthDay = endOfMonth(currentMonth);

    return eachDayOfInterval({
      start: startOfWeek(firstMonthDay, { weekStartsOn: 0 }),
      end: endOfWeek(lastMonthDay, { weekStartsOn: 0 }),
    });
  }, [currentMonth]);

  const openDetail = (date) => {
    const key = toDateKey(date);
    const publicHolidays = holidayMap.get(key) || [];
    const weekend = [0, 6].includes(getDay(date));

    if (!weekend && publicHolidays.length === 0) {
      return;
    }

    setSelectedItem({
      date,
      publicHolidays,
      isWeekend: weekend,
    });
  };

  const navigateMonth = (direction) => {
    setCurrentMonth((prev) => addMonths(prev, direction));
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <motion.section
      initial="hidden"
      animate={isLoaded ? "visible" : "hidden"}
      variants={containerVariants}
      className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-lg backdrop-blur-sm sm:p-6"
    >
      {/* Calendar Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.1, backgroundColor: "#f1f5f9" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigateMonth(-1)}
            className="rounded-lg border border-slate-300 p-2 hover:bg-slate-50"
          >
            <ChevronLeftIcon className="h-5 w-5 text-slate-600" />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.1, backgroundColor: "#f1f5f9" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigateMonth(1)}
            className="rounded-lg border border-slate-300 p-2 hover:bg-slate-50"
          >
            <ChevronRightIcon className="h-5 w-5 text-slate-600" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCurrentMonth(startOfMonth(today))}
            className="ml-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Today
          </motion.button>
        </div>

        <motion.h2 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent"
        >
          {format(currentMonth, "MMMM yyyy")}
        </motion.h2>

        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Year:</span>
          <select
            value={currentYear}
            onChange={(event) =>
              setCurrentMonth((prev) =>
                new Date(Number(event.target.value), prev.getMonth(), 1),
              )
            }
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-4 flex items-center gap-2 rounded-lg bg-rose-50 p-4 text-rose-600"
          >
            <InformationCircleIcon className="h-5 w-5" />
            <span className="text-sm">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[560px] sm:min-w-[700px]">
          {/* Weekday Headers */}
          <div className="mb-2 grid grid-cols-7 gap-1">
            {weekDays.map((day, index) => (
              <motion.div
                key={day}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className={`rounded-lg p-2 text-center text-xs font-semibold sm:p-3 sm:text-sm ${
                  index === 0 || index === 6
                    ? "bg-amber-50 text-amber-700"
                    : "bg-slate-50 text-slate-600"
                }`}
              >
                {day}
              </motion.div>
            ))}
          </div>

          {/* Calendar Days */}
          <motion.div 
            variants={containerVariants}
            className="grid grid-cols-7 gap-1"
          >
            {days.map((day) => {
              const weekend = [0, 6].includes(getDay(day));
              const key = toDateKey(day);
              const publicHolidays = holidayMap.get(key) || [];
              const publicHoliday = publicHolidays.length > 0;
              const todayCell = isToday(day);
              const outsideMonth = !isSameMonth(day, currentMonth);

              return (
                <motion.button
                  key={key}
                  variants={dayVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => openDetail(day)}
                  className={`
                    relative min-h-20 rounded-xl border p-1.5 text-left transition-shadow sm:min-h-24 sm:p-2
                    ${publicHoliday 
                      ? 'border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm hover:shadow-md' 
                      : weekend && !publicHoliday
                        ? 'border-red-200 bg-gradient-to-br from-red-50 to-rose-50'
                        : 'border-slate-200 bg-white hover:border-amber-200'
                    }
                    ${todayCell ? 'ring-2 ring-amber-500 ring-offset-2' : ''}
                    ${outsideMonth ? 'opacity-50' : ''}
                  `}
                  title={publicHoliday || weekend ? "Click to view details" : "Working day"}
                >
                  {/* Date Number */}
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-semibold ${
                      publicHoliday 
                        ? 'text-amber-700' 
                        : weekend 
                          ? 'text-red-700' 
                          : 'text-slate-700'
                    }`}>
                      {format(day, "d")}
                    </span>
                    
                    {todayCell && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="rounded-full bg-amber-500 px-2 py-0.5 text-[8px] font-bold text-white"
                      >
                        TODAY
                      </motion.span>
                    )}
                  </div>

                  {/* Holiday Indicators */}
                  <div className="mt-2 space-y-1">
                    {weekend && !publicHoliday && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-medium text-red-700"
                      >
                        Weekend
                      </motion.div>
                    )}

                    <AnimatePresence>
                      {publicHolidays.slice(0, 2).map((holiday, idx) => (
                        <motion.div
                          key={holiday._id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ delay: idx * 0.1 }}
                          className="truncate rounded-lg bg-amber-200 px-2 py-1 text-[9px] font-medium text-amber-800 shadow-sm"
                        >
                          {holiday.title}
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {publicHolidays.length > 2 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-[8px] font-medium text-amber-600"
                      >
                        +{publicHolidays.length - 2} more
                      </motion.div>
                    )}
                  </div>

                  {/* Decorative Elements */}
                  {publicHoliday && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute bottom-1 right-1"
                    >
                      <SparklesIcon className="h-3 w-3 text-amber-500" />
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        </div>
      </div>

      {/* Loading State */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-amber-50 p-3"
          >
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            <span className="text-sm text-amber-700">Loading holidays...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-200 pt-4"
      >
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-amber-500" />
          <span className="text-xs text-slate-600">Public Holiday</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-slate-300" />
          <span className="text-xs text-slate-600">Weekend</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-white border border-slate-300" />
          <span className="text-xs text-slate-600">Working Day</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-amber-500 ring-2 ring-amber-200 ring-offset-1" />
          <span className="text-xs text-slate-600">Today</span>
        </div>
      </motion.div>

      {/* Holiday Details Modal */}
      <HolidayDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </motion.section>
  );
}
