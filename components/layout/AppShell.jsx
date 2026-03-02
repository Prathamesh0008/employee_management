"use client";

import { apiFetch } from "@/lib/client-api";
import {
  claimNotificationBeeps,
  prepareNotificationBeepRegistry,
} from "@/lib/notification-beep-registry";
import {
  playHighPriorityNotificationBeep,
  playNotificationBeep,
  prepareNotificationSound,
} from "@/lib/notification-sound";
import SidebarCalendar from "@/components/layout/SidebarCalendar";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  BriefcaseIcon,
  CalendarIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  BellIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

const NOTIFICATION_REFRESH_MS = 5000;

// Icon mapping for different link types
const iconMap = {
  dashboard: HomeIcon,
  tasks: BriefcaseIcon,
  calendar: CalendarIcon,
  reports: ChartBarIcon,
  settings: Cog6ToothIcon,
  default: HomeIcon,
};

const sidebarVariants = {
  hidden: { x: -300, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
  exit: {
    x: -300,
    opacity: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
    },
  },
};

const linkVariants = {
  hidden: { x: -20, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20,
    },
  },
  hover: {
    scale: 1.02,
    x: 5,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25,
    },
  },
  tap: { scale: 0.98 },
};

const contentVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
      delay: 0.3,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.2,
    },
  },
};

export default function AppShell({ user, links, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notifications, setNotifications] = useState(0);
  const [urgentTaskAlert, setUrgentTaskAlert] = useState(null);
  const hasLoadedNotifications = useRef(false);
  const knownNotificationIds = useRef(new Set());

  const isHighPriorityNotification = (item) =>
    item?.type === "task-assigned-high-priority" || item?.meta?.priority === "high";

  const hydrateUrgentTaskAlert = async (notification) => {
    const taskId = notification?.meta?.taskId;

    setUrgentTaskAlert({
      notification,
      task: null,
      loading: Boolean(taskId),
      starting: false,
      error: "",
    });

    if (!taskId) {
      return;
    }

    try {
      const response = await apiFetch(`/api/tasks/${taskId}`, { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load urgent task");
      }

      setUrgentTaskAlert((prev) => {
        if (!prev || String(prev.notification?._id) !== String(notification?._id)) {
          return prev;
        }

        return {
          ...prev,
          task: data.task || null,
          loading: false,
          error: "",
        };
      });
    } catch (error) {
      setUrgentTaskAlert((prev) => {
        if (!prev || String(prev.notification?._id) !== String(notification?._id)) {
          return prev;
        }

        return {
          ...prev,
          loading: false,
          error: error.message || "Unable to load urgent task details",
        };
      });
    }
  };

  useEffect(() => {
    void apiFetch("/api/auth/me", { cache: "no-store" });
  }, []);

  useEffect(() => {
    prepareNotificationSound();
    prepareNotificationBeepRegistry();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadUnreadCount = async () => {
      try {
        const response = await apiFetch("/api/notifications?limit=20", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const latestNotifications = data.notifications || [];
        const nextIds = new Set(latestNotifications.map((item) => String(item._id)));

        if (!cancelled) {
          setNotifications(data.unreadCount || 0);

          if (hasLoadedNotifications.current) {
            const newNotifications = latestNotifications.filter(
              (item) => !knownNotificationIds.current.has(String(item._id)),
            );
            const newNotificationIds = newNotifications.map((item) => String(item._id));

            const claimedNotificationIds = claimNotificationBeeps(newNotificationIds);

            if (claimedNotificationIds.length > 0) {
              const claimedIdSet = new Set(claimedNotificationIds);
              const claimedNotifications = newNotifications.filter((item) =>
                claimedIdSet.has(String(item._id)),
              );
              const urgentNotifications = claimedNotifications.filter(isHighPriorityNotification);
              const normalNotifications = claimedNotifications.filter(
                (item) => !isHighPriorityNotification(item),
              );

              if (urgentNotifications.length > 0) {
                void playHighPriorityNotificationBeep();
                void hydrateUrgentTaskAlert(urgentNotifications[0]);
              }

              if (normalNotifications.length > 0) {
                void playNotificationBeep(normalNotifications.length);
              }
            }
          } else {
            hasLoadedNotifications.current = true;
          }

          knownNotificationIds.current = nextIds;
        }
      } catch {
        // Ignore notification fetch errors in shell.
      }
    };

    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") {
        void loadUnreadCount();
      }
    };

    const onNotificationsUpdated = () => {
      void loadUnreadCount();
    };

    void loadUnreadCount();
    const timer = setInterval(() => {
      refreshIfVisible();
    }, NOTIFICATION_REFRESH_MS);

    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);
    window.addEventListener("notifications:updated", onNotificationsUpdated);

    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
      window.removeEventListener("notifications:updated", onNotificationsUpdated);
    };
  }, []);

  const openNotifications = () => {
    router.push(`/${user.role}/notifications`);
  };

  const closeUrgentTaskAlert = () => {
    setUrgentTaskAlert((prev) => {
      if (prev?.task?.status === "pending") {
        return prev;
      }

      return null;
    });
  };

  const openUrgentTaskDashboard = () => {
    setUrgentTaskAlert(null);
    router.push(`/${user.role}/dashboard`);
  };

  const openUrgentNotifications = () => {
    setUrgentTaskAlert(null);
    openNotifications();
  };

  const startUrgentTask = async () => {
    const taskId = urgentTaskAlert?.task?._id || urgentTaskAlert?.notification?.meta?.taskId;

    if (!taskId) {
      return;
    }

    setUrgentTaskAlert((prev) => (prev ? { ...prev, starting: true, error: "" } : prev));

    try {
      const response = await apiFetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in-progress" }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to start urgent task");
      }

      setUrgentTaskAlert((prev) => (prev ? {
        ...prev,
        task: data.task || prev.task,
        starting: false,
        error: "",
      } : prev));

      router.push(`/${user.role}/dashboard`);
      router.refresh();
    } catch (error) {
      setUrgentTaskAlert((prev) => (prev ? {
        ...prev,
        starting: false,
        error: error.message || "Unable to start urgent task",
      } : prev));
    }
  };

  const logout = async () => {
    setIsLoggingOut(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
      setIsLoggingOut(false);
    }
  };

  return (
    <motion.div 
      className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.12),transparent_24%),linear-gradient(180deg,#050b16_0%,#0b1324_100%)]"
      initial="hidden"
      animate="visible"
    >
      <div className="flex min-h-screen w-full min-w-0 flex-col md:flex-row">
        {/* Mobile Header */}
        <motion.div 
          variants={linkVariants}
          className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/85 px-4 py-3 backdrop-blur-lg md:hidden"
        >
          <div className="flex min-w-0 items-center gap-3">
            <motion.div
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.3 }}
              className="h-8 w-8 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 shadow-[0_0_24px_rgba(56,189,248,0.35)]"
            />
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-slate-100">Employee Portal</h2>
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">{user.role}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={openNotifications}
              className="relative rounded-full p-2 text-slate-300 transition hover:bg-slate-800/80"
            >
              <BellIcon className="h-5 w-5" />
              {notifications > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute right-1 top-1 h-4 w-4 rounded-full bg-rose-500 text-[10px] font-medium text-white flex items-center justify-center"
                >
                  {notifications}
                </motion.span>
              )}
            </motion.button>

            <motion.button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="rounded-lg border border-slate-800 bg-slate-900/90 p-2 shadow-sm"
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="h-5 w-5 text-slate-200" />
              ) : (
                <Bars3Icon className="h-5 w-5 text-slate-200" />
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.button
              type="button"
              aria-label="Close menu overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-slate-900/20 backdrop-blur-sm md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <AnimatePresence mode="wait">
          {(mobileMenuOpen || !mobileMenuOpen) && (
            <motion.aside
              variants={sidebarVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={`fixed inset-y-0 left-0 z-40 flex h-full w-[85vw] max-w-72 flex-col overflow-y-auto border-r border-slate-800/80 bg-slate-950/88 shadow-2xl backdrop-blur-xl md:w-72 md:max-w-none md:translate-x-0 ${
                mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
              }`}
            >
              {/* Sidebar Header */}
              <motion.div 
                variants={linkVariants}
                className="border-b border-slate-800/80 p-6"
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.5 }}
                    className="h-10 w-10 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 shadow-[0_0_26px_rgba(56,189,248,0.35)]"
                  />
                  <div>
                    <h2 className="bg-gradient-to-r from-cyan-300 via-blue-300 to-indigo-300 bg-clip-text text-lg font-bold text-transparent">
                      EMS Portal
                    </h2>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{user.role}</p>
                  </div>
                </div>
              </motion.div>

              {/* Navigation + Calendar */}
              <div className="flex-1 space-y-4 p-4">
                <nav className="space-y-1">
                  {links.map((link, index) => {
                    const active = pathname === link.href;
                    const Icon = iconMap[link.icon] || iconMap.default;

                    return (
                      <motion.div
                        key={link.href}
                        variants={linkVariants}
                        custom={index}
                        whileHover="hover"
                        whileTap="tap"
                      >
                        <Link
                          href={link.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                            active
                              ? "bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 text-white shadow-[0_14px_30px_rgba(37,99,235,0.35)]"
                              : "text-slate-300 hover:bg-slate-900/90 hover:text-cyan-300"
                          }`}
                        >
                          <Icon className={`h-5 w-5 ${active ? "text-white" : "text-slate-500"}`} />
                          <span className="flex-1">{link.label}</span>
                          {active && (
                            <motion.div
                              layoutId="active-indicator"
                              className="h-1.5 w-1.5 rounded-full bg-cyan-100"
                            />
                          )}
                        </Link>
                      </motion.div>
                    );
                  })}
                </nav>

                <SidebarCalendar />
              </div>

              {/* User Profile Section */}
              <motion.div 
                variants={linkVariants}
                className="border-t border-slate-800/80 p-4"
              >
                <div className="flex w-full items-center gap-3 rounded-xl p-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 font-semibold text-white shadow-[0_0_24px_rgba(56,189,248,0.24)]">
                    {user.name.charAt(0)}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-slate-100">{user.name}</p>
                    <p className="truncate text-xs text-slate-400">{user.email}</p>
                  </div>
                </div>

                <motion.button
                  type="button"
                  onClick={logout}
                  disabled={isLoggingOut}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-300 hover:bg-rose-500/15 disabled:opacity-50"
                >
                  {isLoggingOut ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Logging out...
                    </>
                  ) : (
                    <>
                      <ArrowRightOnRectangleIcon className="h-4 w-4" />
                      Logout
                    </>
                  )}
                </motion.button>
              </motion.div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <motion.main
          variants={contentVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8 md:ml-72"
        >
          {/* Desktop Header */}
          <motion.div 
            variants={linkVariants}
            className="mb-6 hidden items-center justify-between gap-3 md:flex"
          >
            <div>
              <motion.h1 
                className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-2xl font-bold text-transparent"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Welcome back, {user.name.split(' ')[0]}!
              </motion.h1>
              <motion.p 
                className="text-sm text-slate-400"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </motion.p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Desktop Notification Bell */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={openNotifications}
                className="relative rounded-full border border-slate-800 bg-slate-900/85 p-2 text-slate-300 transition hover:bg-slate-800"
              >
                <BellIcon className="h-5 w-5" />
                {notifications > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute right-1 top-1 h-4 w-4 rounded-full bg-rose-500 text-[10px] font-medium text-white flex items-center justify-center"
                  >
                    {notifications}
                  </motion.span>
                )}
              </motion.button>
            </div>
          </motion.div>

          {/* Page Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="min-w-0"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </motion.main>
      </div>

      <AnimatePresence>
        {urgentTaskAlert ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
            onClick={closeUrgentTaskAlert}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-rose-500/30 bg-[linear-gradient(180deg,rgba(69,10,10,0.96)_0%,rgba(17,24,39,0.98)_100%)] shadow-[0_24px_80px_rgba(244,63,94,0.28)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="border-b border-rose-500/20 px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-rose-500/15 p-3 text-rose-300">
                      <ExclamationTriangleIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-300">
                        High Priority Task
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-white">
                        {urgentTaskAlert.task?.title || urgentTaskAlert.notification?.title || "Urgent task assigned"}
                      </h3>
                    </div>
                  </div>
                  {urgentTaskAlert.task?.status !== "pending" ? (
                    <button
                      type="button"
                      onClick={closeUrgentTaskAlert}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="space-y-5 px-6 py-5">
                <p className="text-sm leading-6 text-slate-200">
                  {urgentTaskAlert.notification?.message || "A manager or boss assigned you a high priority task."}
                </p>

                {urgentTaskAlert.loading ? (
                  <div className="rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-6 text-sm text-slate-300">
                    Loading urgent task details...
                  </div>
                ) : null}

                {urgentTaskAlert.task ? (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-rose-200/80">Assigned By</p>
                      <p className="mt-1 text-sm font-medium text-white">
                        {urgentTaskAlert.task.assignedBy?.name || urgentTaskAlert.notification?.meta?.assignedByName || "Management"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-700 bg-slate-900/75 px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Task Details</p>
                          <p className="mt-2 text-base font-semibold text-white">
                            {urgentTaskAlert.task.title}
                          </p>
                        </div>
                        <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-300">
                          {urgentTaskAlert.task.status === "in-progress" ? "Started" : urgentTaskAlert.task.status}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-300">
                        {urgentTaskAlert.task.description || "No task description available."}
                      </p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Due Date</p>
                          <p className="mt-1 text-sm font-medium text-slate-100">
                            {new Date(urgentTaskAlert.task.taskDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Priority</p>
                          <p className="mt-1 text-sm font-medium text-rose-300">
                            High
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {urgentTaskAlert.error ? (
                  <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                    {urgentTaskAlert.error}
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => void startUrgentTask()}
                    disabled={urgentTaskAlert.loading || urgentTaskAlert.starting || urgentTaskAlert.task?.status === "in-progress" || urgentTaskAlert.task?.status === "completed"}
                    className="flex-1 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(249,115,22,0.28)] transition hover:brightness-110"
                  >
                    {urgentTaskAlert.starting
                      ? "Starting..."
                      : urgentTaskAlert.task?.status === "in-progress"
                        ? "Task Started"
                        : urgentTaskAlert.task?.status === "completed"
                          ? "Task Completed"
                          : "Start Task"}
                  </button>
                  <button
                    type="button"
                    onClick={openUrgentTaskDashboard}
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-800"
                  >
                    View Tasks
                  </button>
                </div>

                {urgentTaskAlert.task?.status !== "pending" ? (
                  <button
                    type="button"
                    onClick={openUrgentNotifications}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-900"
                  >
                    Open Notifications
                  </button>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
