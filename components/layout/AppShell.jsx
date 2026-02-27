"use client";

import { apiFetch } from "@/lib/client-api";
import SidebarCalendar from "@/components/layout/SidebarCalendar";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    void apiFetch("/api/auth/me", { cache: "no-store" });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadUnreadCount = async () => {
      try {
        const response = await apiFetch("/api/notifications?unread=true&limit=1", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (!cancelled) {
          setNotifications(data.unreadCount || 0);
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
      className="min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/30"
      initial="hidden"
      animate="visible"
    >
      <div className="flex min-h-screen w-full min-w-0 flex-col md:flex-row">
        {/* Mobile Header */}
        <motion.div 
          variants={linkVariants}
          className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur-lg md:hidden"
        >
          <div className="flex min-w-0 items-center gap-3">
            <motion.div
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.3 }}
              className="h-8 w-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
            />
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-slate-900">Employee Portal</h2>
              <p className="text-xs text-indigo-600">{user.role}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={openNotifications}
              className="relative rounded-full p-2 hover:bg-slate-100"
            >
              <BellIcon className="h-5 w-5 text-slate-600" />
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
              className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm"
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="h-5 w-5 text-slate-600" />
              ) : (
                <Bars3Icon className="h-5 w-5 text-slate-600" />
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
              className={`fixed inset-y-0 left-0 z-40 flex h-full w-[85vw] max-w-72 flex-col overflow-y-auto border-r border-slate-200 bg-white/90 shadow-xl backdrop-blur-xl md:w-72 md:max-w-none md:translate-x-0 ${
                mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
              }`}
            >
              {/* Sidebar Header */}
              <motion.div 
                variants={linkVariants}
                className="border-b border-slate-200 p-6"
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.5 }}
                    className="h-10 w-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-lg"
                  />
                  <div>
                    <h2 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      EMS Portal
                    </h2>
                    <p className="text-xs font-medium text-indigo-600">{user.role}</p>
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
                              ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md"
                              : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-600"
                          }`}
                        >
                          <Icon className={`h-5 w-5 ${active ? "text-white" : "text-slate-400"}`} />
                          <span className="flex-1">{link.label}</span>
                          {active && (
                            <motion.div
                              layoutId="active-indicator"
                              className="h-1.5 w-1.5 rounded-full bg-white"
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
                className="border-t border-slate-200 p-4"
              >
                <div className="flex w-full items-center gap-3 rounded-xl p-2">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                    {user.name.charAt(0)}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-slate-900">{user.name}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>
                </div>

                <motion.button
                  type="button"
                  onClick={logout}
                  disabled={isLoggingOut}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-100 disabled:opacity-50"
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
                className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Welcome back, {user.name.split(' ')[0]}!
              </motion.h1>
              <motion.p 
                className="text-sm text-slate-500"
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
                className="relative rounded-full p-2 hover:bg-slate-100"
              >
                <BellIcon className="h-5 w-5 text-slate-600" />
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
    </motion.div>
  );
}
