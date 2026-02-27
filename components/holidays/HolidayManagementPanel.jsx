"use client";

import { apiFetch } from "@/lib/client-api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  CheckCircleIcon,
  SunIcon,
  CloudIcon,
  SparklesIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

import HolidayCalendar from "@/components/calendar/HolidayCalendar";

function formatDateInput(value) {
  if (!value) {
    return "";
  }

  const text = String(value);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(0, 10);
}

function formatDisplayDate(dateString) {
  if (!dateString) {
    return "-";
  }

  const text = String(dateString);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const parsed = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(text);

  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleDateString("en-US", {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 12,
    },
  },
};

const cardVariants = {
  hidden: { scale: 0.95, opacity: 0 },
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
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25,
    },
  },
  tap: { scale: 0.98 },
};

export default function HolidayManagementPanel() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingId, setEditingId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [form, setForm] = useState({
    title: "",
    date: "",
    description: "",
  });

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const yearOptions = useMemo(() => {
    const years = [];
    for (let year = currentYear - 5; year <= currentYear + 5; year += 1) {
      years.push(year);
    }
    if (!years.includes(selectedYear)) {
      years.push(selectedYear);
      years.sort((a, b) => a - b);
    }
    return years;
  }, [currentYear, selectedYear]);

  const monthNames = useMemo(() => [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ], []);

  const loadHolidays = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await apiFetch(`/api/holidays?month=${selectedMonth}&year=${selectedYear}`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to load holidays");
        return;
      }

      setHolidays(data.holidays || []);
    } catch {
      setError("Unable to load holidays");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    loadHolidays();
  }, [loadHolidays, refreshKey]);

  const onMonthChange = useCallback(({ month, year }) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  }, []);

  const onFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setEditingId("");
    setForm({ title: "", date: "", description: "" });
    setError("");
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    const method = editingId ? "PATCH" : "POST";
    const endpoint = editingId ? `/api/holidays/${editingId}` : "/api/holidays";

    try {
      const response = await apiFetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to save holiday");
        return;
      }

      setSuccess(editingId ? "Holiday updated successfully!" : "Holiday added successfully!");
      resetForm();
      setRefreshKey((value) => value + 1);
      
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Unable to save holiday");
    } finally {
      setSubmitting(false);
    }
  };

  const onEdit = (holiday) => {
    setEditingId(holiday._id);
    setForm({
      title: holiday.title,
      date: formatDateInput(holiday.date),
      description: holiday.description || "",
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onDelete = async (holidayId) => {
    setDeleteConfirm(holidayId);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      const response = await apiFetch(`/api/holidays/${deleteConfirm}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to delete holiday");
        return;
      }

      setSuccess("Holiday deleted successfully!");
      setRefreshKey((value) => value + 1);
      setDeleteConfirm(null);
      
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Unable to delete holiday");
    }
  };

  const navigateMonth = (direction) => {
    let newMonth = selectedMonth + direction;
    let newYear = selectedYear;
    
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  return (
    <motion.div 
      className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 p-4 md:p-6 lg:p-8"
      initial="hidden"
      animate={isLoaded ? "visible" : "hidden"}
      variants={containerVariants}
    >
      {/* Header Section */}
      <motion.div 
        variants={itemVariants}
        className="mb-8 flex items-center justify-between"
      >
        <div>
          <motion.h1 
            className="text-2xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent md:text-3xl"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Holiday Management
          </motion.h1>
          <motion.p 
            className="mt-1 text-sm text-slate-500"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Manage public holidays and observances
          </motion.p>
        </div>
        <motion.div 
          className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <SunIcon className="h-5 w-5 text-amber-500" />
          <span className="text-sm font-medium text-slate-700">
            {holidays.length} {holidays.length === 1 ? 'Holiday' : 'Holidays'}
          </span>
        </motion.div>
      </motion.div>

      {/* Calendar Section */}
      <motion.div variants={itemVariants} className="mb-8">
        <HolidayCalendar refreshKey={refreshKey} onMonthChange={onMonthChange} />
      </motion.div>

      {/* Success/Error Messages */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-4 text-emerald-700"
          >
            <CheckCircleIcon className="h-5 w-5" />
            <span className="text-sm font-medium">{success}</span>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="mb-4 flex items-center gap-2 rounded-lg bg-rose-50 p-4 text-rose-600"
          >
            <XMarkIcon className="h-5 w-5" />
            <span className="text-sm font-medium">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit Holiday Form */}
      <motion.section 
        variants={itemVariants}
        className="mb-8 rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-lg backdrop-blur-sm"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-full bg-amber-100 p-2">
            {editingId ? (
              <PencilIcon className="h-5 w-5 text-amber-600" />
            ) : (
              <PlusIcon className="h-5 w-5 text-amber-600" />
            )}
          </div>
          <h2 className="text-xl font-semibold text-slate-900">
            {editingId ? "Edit Public Holiday" : "Add Public Holiday"}
          </h2>
        </div>

        <p className="mb-4 text-sm text-slate-500 flex items-center gap-2">
          <SparklesIcon className="h-4 w-4 text-amber-500" />
          Saturdays and Sundays are auto-detected as holidays and are not stored in the database.
        </p>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Holiday Title */}
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="space-y-1"
            >
              <label className="text-sm font-medium text-slate-700">Holiday Title</label>
              <div className="relative">
                <input
                  name="title"
                  required
                  value={form.title}
                  onChange={onFormChange}
                  placeholder="e.g., Independence Day"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 pl-10 transition-all focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
                <SunIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              </div>
            </motion.div>

            {/* Holiday Date */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="space-y-1"
            >
              <label className="text-sm font-medium text-slate-700">Holiday Date</label>
              <div className="relative">
                <input
                  type="date"
                  name="date"
                  required
                  value={form.date}
                  onChange={onFormChange}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 pl-10 transition-all focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
                <CalendarIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              </div>
            </motion.div>

            {/* Description */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="space-y-1 md:col-span-2"
            >
              <label className="text-sm font-medium text-slate-700">Description (Optional)</label>
              <textarea
                name="description"
                value={form.description}
                onChange={onFormChange}
                placeholder="Add any additional details about this holiday..."
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 transition-all focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
              />
            </motion.div>
          </div>

          {/* Form Actions */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col gap-3 pt-4 sm:flex-row"
          >
            <motion.button
              type="submit"
              disabled={submitting}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-medium text-white shadow-md hover:bg-amber-700 disabled:bg-amber-400"
            >
              {submitting ? (
                <>
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  {editingId ? <PencilIcon className="h-5 w-5" /> : <PlusIcon className="h-5 w-5" />}
                  {editingId ? "Update Holiday" : "Add Holiday"}
                </>
              )}
            </motion.button>

            {editingId && (
              <motion.button
                type="button"
                onClick={resetForm}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="rounded-lg border border-slate-300 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel Edit
              </motion.button>
            )}
          </motion.div>
        </form>
      </motion.section>

      {/* Holidays List Section */}
      <motion.section 
        variants={itemVariants}
        className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-lg backdrop-blur-sm"
      >
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-amber-100 p-2">
              <CalendarIcon className="h-5 w-5 text-amber-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">Public Holidays</h2>
          </div>

          {/* Month/Year Navigation */}
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigateMonth(-1)}
              className="rounded-lg border border-slate-300 bg-white p-2 hover:bg-slate-50"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </motion.button>
            
            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(Number(event.target.value))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
              >
                {monthNames.map((month, index) => (
                  <option key={index + 1} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
              
              <select
                value={selectedYear}
                onChange={(event) => setSelectedYear(Number(event.target.value))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigateMonth(1)}
              className="rounded-lg border border-slate-300 bg-white p-2 hover:bg-slate-50"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </motion.button>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {deleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              onClick={() => setDeleteConfirm(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="max-w-md rounded-2xl bg-white p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-semibold text-slate-900">Delete Holiday</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Are you sure you want to delete this holiday? This action cannot be undone.
                </p>
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-amber-200 border-t-amber-600" />
          </div>
        ) : holidays.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-12"
          >
            <CloudIcon className="h-16 w-16 text-slate-300" />
            <p className="mt-4 text-sm text-slate-500">No public holidays for {monthNames[selectedMonth - 1]} {selectedYear}</p>
            <p className="text-sm text-slate-400">Add your first holiday using the form above</p>
          </motion.div>
        ) : (
          <>
            {/* Mobile View */}
            <div className="space-y-3 lg:hidden">
              <AnimatePresence mode="popLayout">
                {holidays.map((holiday, index) => (
                  <motion.div
                    key={holiday._id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{holiday.title}</p>
                        <p className="mt-1 text-sm text-amber-600 font-medium">
                          {formatDisplayDate(holiday.date)}
                        </p>
                      </div>
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                        Holiday
                      </span>
                    </div>
                    {holiday.description && (
                      <p className="mt-2 text-sm text-slate-500">{holiday.description}</p>
                    )}
                    <div className="mt-3 flex gap-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onEdit(holiday)}
                        className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        <PencilIcon className="h-3 w-3" />
                        Edit
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onDelete(holiday._id)}
                        className="flex items-center gap-1 rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
                      >
                        <TrashIcon className="h-3 w-3" />
                        Delete
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Desktop Table View */}
            <div className="hidden overflow-x-auto rounded-xl border border-slate-200 lg:block">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Holiday</th>
                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Description</th>
                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  <AnimatePresence>
                    {holidays.map((holiday, index) => (
                      <motion.tr
                        key={holiday._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: index * 0.03 }}
                        whileHover={{ backgroundColor: "rgba(241, 245, 249, 0.5)" }}
                        className="transition-colors"
                      >
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-amber-500" />
                            <span className="text-sm font-medium text-slate-900">
                              {formatDisplayDate(holiday.date)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-slate-900">{holiday.title}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-slate-500">
                            {holiday.description || "-"}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex gap-2">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => onEdit(holiday)}
                              className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            >
                              <PencilIcon className="h-3 w-3" />
                              Edit
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => onDelete(holiday._id)}
                              className="flex items-center gap-1 rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
                            >
                              <TrashIcon className="h-3 w-3" />
                              Delete
                            </motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </>
        )}
      </motion.section>
    </motion.div>
  );
}
