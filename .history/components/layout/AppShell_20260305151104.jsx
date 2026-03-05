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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  ChevronDownIcon,
  PlayIcon,
  StopIcon,
  SunIcon,
  MoonIcon,
  BeakerIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";

/* ------------------- CONSTANTS ------------------- */

const NOTIFICATION_REFRESH_MS = 5000;
const BREAK_MENU_REFRESH_MS = 30000;

const BREAK_MENU_TYPES = [
  { key: "morning", label: "Morning Break", allowedMinutes: 15, icon: SunIcon },
  { key: "lunch", label: "Lunch Break", allowedMinutes: 30, icon: BeakerIcon },
  { key: "afternoon", label: "Afternoon Break", allowedMinutes: 15, icon: MoonIcon },
];

/* ------------------- HELPERS ------------------- */

function formatTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function secondsSince(dateValue, nowMs) {
  if (!dateValue) return 0;
  return Math.max(0, Math.floor((nowMs - new Date(dateValue).getTime()) / 1000));
}

function formatTimer(secondsValue) {
  const minutes = Math.floor(secondsValue / 60);
  const seconds = secondsValue % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatBreakTypeLabel(type) {
  return String(type)
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

/* ------------------- ICON MAP ------------------- */

const iconMap = {
  dashboard: HomeIcon,
  tasks: BriefcaseIcon,
  calendar: CalendarIcon,
  reports: ChartBarIcon,
  currency: CurrencyDollarIcon,
  settings: Cog6ToothIcon,
  default: HomeIcon,
};

/* ------------------- ANIMATIONS ------------------- */

const sidebarVariants = {
  hidden: { x: -300, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: "spring", stiffness: 260, damping: 25 } },
  exit: { x: -300, opacity: 0 },
};

const linkVariants = {
  hidden: { x: -20, opacity: 0 },
  visible: { x: 0, opacity: 1 },
  hover: { scale: 1.03, x: 4 },
};

/* ================================================= */
/* ================= APP SHELL ===================== */
/* ================================================= */

export default function AppShell({ user, links, children }) {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState(0);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const hasLoadedNotifications = useRef(false);
  const knownNotificationIds = useRef(new Set());

  const todayDate = new Date().toISOString().slice(0, 10);

  /* ------------------- INIT ------------------- */

  useEffect(() => {
    prepareNotificationSound();
    prepareNotificationBeepRegistry();
  }, []);

  /* ------------------- NOTIFICATIONS ------------------- */

  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const response = await apiFetch("/api/notifications?limit=20", { cache: "no-store" });

        if (!response.ok) return;

        const data = await response.json();
        setNotifications(data.unreadCount || 0);

        const latest = data.notifications || [];
        const nextIds = new Set(latest.map((i) => String(i._id)));

        if (hasLoadedNotifications.current) {
          const newItems = latest.filter(
            (item) => !knownNotificationIds.current.has(String(item._id)),
          );

          if (newItems.length) {
            const ids = newItems.map((i) => String(i._id));
            const claimed = claimNotificationBeeps(ids);

            if (claimed.length) {
              playNotificationBeep(claimed.length);
            }
          }
        } else {
          hasLoadedNotifications.current = true;
        }

        knownNotificationIds.current = nextIds;
      } catch {}
    };

    loadUnreadCount();

    const timer = setInterval(loadUnreadCount, NOTIFICATION_REFRESH_MS);

    return () => clearInterval(timer);
  }, []);

  /* ------------------- LOGOUT ------------------- */

  const logout = async () => {
    setIsLoggingOut(true);

    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } catch {
      setIsLoggingOut(false);
    }
  };

  const openNotifications = () => {
    router.push(`/${user.role}/notifications`);
  };

  /* ================================================= */
  /* ====================== UI ======================= */
  /* ================================================= */

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.15),transparent_25%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.15),transparent_30%),#020617] text-slate-200">
      
      <div className="flex min-h-screen">

        {/* ================= SIDEBAR ================= */}

        <AnimatePresence>
          <motion.aside
            variants={sidebarVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed left-0 top-0 h-full w-72 border-r border-slate-800 bg-slate-950/90 backdrop-blur-xl shadow-2xl"
          >
            {/* Logo */}

            <div className="border-b border-slate-800 p-6 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500" />
              <div>
                <h2 className="text-lg font-bold text-white">EMS Portal</h2>
                <p className="text-xs uppercase text-slate-400">{user.role}</p>
              </div>
            </div>

            {/* Navigation */}

            <div className="p-4 space-y-1">

              {links.map((link) => {

                const active = pathname === link.href;
                const Icon = iconMap[link.icon] || iconMap.default;

                return (
                  <motion.div
                    key={link.href}
                    variants={linkVariants}
                    whileHover="hover"
                  >
                    <Link
                      href={link.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                        active
                          ? "bg-gradient-to-r from-cyan-500 to-indigo-500 text-white"
                          : "hover:bg-slate-900 text-slate-300"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {link.label}
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            <SidebarCalendar />

            {/* User Section */}

            <div className="absolute bottom-0 w-full border-t border-slate-800 p-4">

              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 flex items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 text-white font-semibold">
                  {user.name.charAt(0)}
                </div>

                <div>
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-slate-400">{user.email}</p>
                </div>
              </div>

              <button
                onClick={logout}
                disabled={isLoggingOut}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 py-2 text-sm text-rose-300 hover:bg-rose-500/20"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4" />
                {isLoggingOut ? "Logging out..." : "Logout"}
              </button>

            </div>
          </motion.aside>
        </AnimatePresence>

        {/* ================= MAIN ================= */}

        <main className="flex-1 ml-72 p-8">

          {/* Top Header */}

          <div className="flex items-center justify-between mb-8">

            <div>
              <h1 className="text-2xl font-bold text-white">
                Welcome back, {user.name.split(" ")[0]}
              </h1>

              <p className="text-sm text-slate-400">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>

            <div className="flex items-center gap-3">

              {/* Notifications */}

              <button
                onClick={openNotifications}
                className="relative p-2 rounded-full border border-slate-800 bg-slate-900 hover:bg-slate-800"
              >
                <BellIcon className="h-5 w-5" />

                {notifications > 0 && (
                  <span className="absolute top-1 right-1 h-4 w-4 text-[10px] rounded-full bg-rose-500 flex items-center justify-center text-white">
                    {notifications}
                  </span>
                )}
              </button>

            </div>
          </div>

          {/* Page Content */}

          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>

        </main>

      </div>

    </div>
  );
}