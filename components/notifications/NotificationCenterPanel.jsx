"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BellIcon,
  BellAlertIcon,
  BellSnoozeIcon,
  CheckCircleIcon,
  XCircleIcon,
  MegaphoneIcon,
  EnvelopeIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  ArrowPathIcon,
  InboxIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

import { apiFetch } from "@/lib/client-api";
import { prepareNotificationSound, testNotificationSound } from "@/lib/notification-sound";

const NOTIFICATION_REFRESH_MS = 5000;

function formatApiError(data, fallbackMessage) {
  if (!data || typeof data !== "object") {
    return fallbackMessage;
  }

  const fieldErrors = data.details?.fieldErrors;

  if (fieldErrors && typeof fieldErrors === "object") {
    const messages = Object.values(fieldErrors)
      .flat()
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join(" ");
    }
  }

  return data.error || fallbackMessage;
}

function formatDateTime(value) {
  return new Date(value).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTimeAgo(value) {
  const now = new Date();
  const past = new Date(value);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDateTime(value);
}

// Animation variants
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
    y: -2,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25,
    },
  },
  tap: { scale: 0.98 },
};

const buttonVariants = {
  hover: { scale: 1.05 },
  tap: { scale: 0.95 },
  disabled: { opacity: 0.5, scale: 1 },
};

const floatingAnimation = {
  initial: { y: 0 },
  animate: {
    y: [-10, 10, -10],
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

const notificationVariants = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
  hover: { scale: 1.01, backgroundColor: "rgba(241, 245, 249, 0.8)" },
};

export default function NotificationCenterPanel({ title, canBroadcast = false, managerMode = false }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sending, setSending] = useState(false);
  const [autoMarkedOnOpen, setAutoMarkedOnOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [filter, setFilter] = useState("all"); // all, unread, read
  const [broadcast, setBroadcast] = useState({
    title: "",
    message: "",
    audience: managerMode ? "employees" : "all",
  });

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    prepareNotificationSound();
  }, []);

  const notifyUnreadChanged = useCallback(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("notifications:updated"));
    }
  }, []);

  const loadItems = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    }
    setError("");

    try {
      const response = await apiFetch("/api/notifications?limit=100", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load notifications");
      }

      setItems(data.notifications || []);
    } catch (loadError) {
      setError(loadError.message || "Unable to load notifications");
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (loading || autoMarkedOnOpen) {
      return;
    }

    setAutoMarkedOnOpen(true);

    if (!items.some((item) => !item.isRead)) {
      notifyUnreadChanged();
      return;
    }

    const markAllOnOpen = async () => {
      try {
        const response = await apiFetch("/api/notifications/read-all", {
          method: "POST",
        });

        if (!response.ok) {
          return;
        }

        setItems((prev) =>
          prev.map((item) => ({
            ...item,
            isRead: true,
            readAt: item.readAt || new Date().toISOString(),
          })),
        );
        notifyUnreadChanged();
        await loadItems({ silent: true });
      } catch {
        // Ignore auto-mark failures; manual actions still available.
      }
    };

    void markAllOnOpen();
  }, [autoMarkedOnOpen, items, loadItems, loading, notifyUnreadChanged]);

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") {
        void loadItems({ silent: true });
      }
    };

    const timer = setInterval(() => {
      refreshIfVisible();
    }, NOTIFICATION_REFRESH_MS);

    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [loadItems]);

  const markOne = async (id, isRead) => {
    setError("");
    setSuccess("");

    try {
      const response = await apiFetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update notification");
      }

      setSuccess(`Notification marked as ${isRead ? 'read' : 'unread'}`);
      await loadItems({ silent: true });
      notifyUnreadChanged();
      
      setTimeout(() => setSuccess(""), 2000);
    } catch (updateError) {
      setError(updateError.message || "Unable to update notification");
    }
  };

  const markAll = async () => {
    setError("");
    setSuccess("");

    try {
      const response = await apiFetch("/api/notifications/read-all", {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to mark notifications");
      }

      setSuccess("All notifications marked as read");
      await loadItems({ silent: true });
      notifyUnreadChanged();
      
      setTimeout(() => setSuccess(""), 2000);
    } catch (updateError) {
      setError(updateError.message || "Unable to mark notifications");
    }
  };

  const sendBroadcast = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const trimmedTitle = broadcast.title.trim();
    const trimmedMessage = broadcast.message.trim();

    if (trimmedTitle.length < 3) {
      setError("Title must be at least 3 characters.");
      return;
    }

    if (trimmedMessage.length < 3) {
      setError("Message must be at least 3 characters.");
      return;
    }

    setSending(true);

    try {
      const response = await apiFetch("/api/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          message: trimmedMessage,
          audience: broadcast.audience,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(formatApiError(data, "Failed to send message"));
      }

      setSuccess("Broadcast sent successfully!");
      setBroadcast({ title: "", message: "", audience: managerMode ? "employees" : "all" });
      await loadItems({ silent: true });
      notifyUnreadChanged();
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (sendError) {
      setError(sendError.message || "Unable to send broadcast");
    } finally {
      setSending(false);
    }
  };

  const handleTestSound = async () => {
    setError("");
    setSuccess("");

    const played = await testNotificationSound();

    if (played) {
      setSuccess("Notification sound played.");
    } else {
      setError("Sound is blocked by the browser. Click anywhere on the page once and try again.");
    }

    setTimeout(() => {
      setSuccess("");
      setError("");
    }, 2500);
  };

  const filteredItems = items.filter(item => {
    if (filter === "unread") return !item.isRead;
    if (filter === "read") return item.isRead;
    return true;
  });

  const unreadCount = items.filter(item => !item.isRead).length;

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 p-3 sm:p-4 md:p-6"
      initial="hidden"
      animate={isLoaded ? "visible" : "hidden"}
      variants={containerVariants}
    >
      {/* Animated Background Elements */}
      <motion.div
        variants={floatingAnimation}
        animate="animate"
        className="fixed left-0 top-20 h-64 w-64 rounded-full bg-blue-500/5 blur-3xl"
      />
      <motion.div
        variants={floatingAnimation}
        animate="animate"
        className="fixed bottom-20 right-0 h-80 w-80 rounded-full bg-indigo-500/5 blur-3xl"
      />

      <div className="relative space-y-4 sm:space-y-6">
        {/* Header Section with Glass Effect */}
        <motion.section 
          variants={itemVariants}
          className="relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-xl border border-white/20 shadow-xl p-4 sm:p-6"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-indigo-600/5" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-red-300">
                {title}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                In-app alerts for tasks, leaves, holidays and updates
              </p>
              {canBroadcast && (
                <p className="mt-1 text-xs text-slate-400">
                  Broadcasts are delivered to recipients only. The sender does not receive the same notification.
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => void handleTestSound()}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm"
              >
                <BellAlertIcon className="h-4 w-4 text-indigo-500" />
                <span className="text-xs sm:text-sm font-medium text-slate-700">Test sound</span>
              </motion.button>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-sm border border-slate-200"
              >
                <BellIcon className="h-4 w-4 text-blue-500" />
                <span className="text-xs sm:text-sm font-medium text-slate-700">
                  {unreadCount} unread
                </span>
              </motion.div>
              {canBroadcast && (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5"
                >
                  <MegaphoneIcon className="h-4 w-4 text-indigo-600" />
                  <span className="text-xs font-medium text-indigo-700">Broadcaster</span>
                </motion.div>
              )}
            </div>
          </div>
        </motion.section>

        {/* Success/Error Messages */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 p-4 shadow-lg"
            >
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
              <p className="relative text-sm font-medium text-white flex items-center gap-2">
                <CheckCircleIcon className="h-5 w-5" />
                {success}
              </p>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="relative overflow-hidden rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 p-4 shadow-lg"
            >
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
              <p className="relative text-sm font-medium text-white flex items-center gap-2">
                <XCircleIcon className="h-5 w-5" />
                {error}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Broadcast Form - Only for authorized users */}
        {canBroadcast && (
          <motion.section 
            variants={itemVariants}
            className="relative overflow-hidden rounded-2xl bg-white shadow-xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-purple-50/50" />
            
            <div className="relative p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 p-2.5 shadow-lg">
                  <MegaphoneIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-800">Broadcast Message</h2>
                  <p className="text-xs sm:text-sm text-slate-500">Send announcements to your team</p>
                </div>
              </div>

              <form onSubmit={sendBroadcast} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <input
                    type="text"
                    value={broadcast.title}
                    onChange={(event) =>
                      setBroadcast((prev) => ({ ...prev, title: event.target.value }))
                    }
                    placeholder="Message title"
                    required
                    className="lg:col-span-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                  />

                  <select
                    value={broadcast.audience}
                    onChange={(event) =>
                      setBroadcast((prev) => ({ ...prev, audience: event.target.value }))
                    }
                    className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                  >
                    {managerMode ? (
                      <option value="employees">Employees</option>
                    ) : (
                      <>
                        <option value="all">All Users</option>
                        <option value="employees">Employees Only</option>
                        <option value="managers">Managers Only</option>
                      </>
                    )}
                  </select>

                  <motion.button
                    type="submit"
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    disabled={sending}
                    className="relative overflow-hidden rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg disabled:opacity-50 transition-all duration-300"
                  >
                    <span className="relative flex items-center justify-center gap-2">
                      {sending ? (
                        <>
                          <ArrowPathIcon className="h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <PaperAirplaneIcon className="h-4 w-4" />
                          Send Broadcast
                        </>
                      )}
                    </span>
                  </motion.button>

                  <textarea
                    value={broadcast.message}
                    onChange={(event) =>
                      setBroadcast((prev) => ({ ...prev, message: event.target.value }))
                    }
                    placeholder="Announcement message"
                    required
                    rows={3}
                    className="lg:col-span-4 rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all duration-200 resize-none"
                  />
                </div>
              </form>
            </div>
          </motion.section>
        )}

        {/* Notifications Section */}
        <motion.section 
          variants={itemVariants}
          className="relative overflow-hidden rounded-2xl bg-white shadow-xl"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/50" />
          
          <div className="relative p-5 sm:p-6">
            {/* Header with Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 p-2.5 shadow-lg">
                  <BellIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-800">Notifications</h2>
                  <p className="text-xs sm:text-sm text-slate-500">Stay updated with latest alerts</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Filter Tabs */}
                <div className="flex rounded-lg border border-slate-200 p-1 bg-white">
                  {[
                    { key: "all", label: "All", icon: InboxIcon },
                    { key: "unread", label: "Unread", icon: BellAlertIcon },
                    { key: "read", label: "Read", icon: BellSnoozeIcon },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <motion.button
                        key={tab.key}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setFilter(tab.key)}
                        className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                          filter === tab.key
                            ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <Icon className="h-3 w-3" />
                        {tab.label}
                        {tab.key === "unread" && unreadCount > 0 && (
                          <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${
                            filter === "unread" ? "bg-white/20" : "bg-blue-100 text-blue-600"
                          }`}>
                            {unreadCount}
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  type="button"
                  onClick={markAll}
                  className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <CheckCircleIcon className="h-4 w-4" />
                  Mark all read
                </motion.button>
              </div>
            </div>

            {/* Loading State */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full border-4 border-slate-200 border-t-blue-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <SparklesIcon className="h-5 w-5 text-blue-500 animate-pulse" />
                  </div>
                </div>
              </div>
            ) : filteredItems.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-12"
              >
                <div className="rounded-full bg-slate-100 p-4 mb-3">
                  <InboxIcon className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-500">No notifications yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  {filter === "all" 
                    ? "You're all caught up!" 
                    : filter === "unread" 
                      ? "No unread notifications" 
                      : "No read notifications"}
                </p>
              </motion.div>
            ) : (
              <AnimatePresence mode="popLayout">
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredItems.map((item, index) => (
                    (() => {
                      const isHighPriorityTask =
                        item.type === "task-assigned-high-priority" || item.meta?.priority === "high";

                      return (
                    <motion.div
                      key={item._id}
                      variants={notificationVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      whileHover="hover"
                      transition={{ delay: index * 0.05 }}
                      className={`group relative overflow-hidden rounded-xl border transition-all duration-200 ${
                        isHighPriorityTask
                          ? item.isRead
                            ? "border-rose-200 bg-gradient-to-r from-rose-50/60 to-orange-50/40 hover:border-rose-300"
                            : "border-rose-300 bg-gradient-to-r from-rose-50 to-orange-50 hover:border-rose-400"
                          : item.isRead 
                            ? "border-slate-200 bg-white hover:border-slate-300" 
                            : "border-blue-200 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 hover:border-blue-300"
                      }`}
                    >
                      {/* Unread Indicator */}
                      {!item.isRead && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className={`absolute left-0 top-0 bottom-0 w-1 ${
                            isHighPriorityTask
                              ? "bg-gradient-to-b from-rose-500 to-orange-500"
                              : "bg-gradient-to-b from-blue-500 to-indigo-500"
                          }`}
                        />
                      )}

                      <div className="relative p-4">
                        <div className="flex items-start justify-between gap-4">
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className={`text-sm font-semibold ${
                                isHighPriorityTask
                                  ? "text-rose-700"
                                  : item.isRead
                                    ? "text-slate-700"
                                    : "text-slate-900"
                              }`}>
                                {item.title}
                              </h3>
                              {isHighPriorityTask && (
                                <motion.span
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700"
                                >
                                  Urgent
                                </motion.span>
                              )}
                              {!item.isRead && (
                                <motion.span
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                    isHighPriorityTask
                                      ? "bg-rose-100 text-rose-700"
                                      : "bg-blue-100 text-blue-700"
                                  }`}
                                >
                                  New
                                </motion.span>
                              )}
                            </div>
                            
                            <p className={`text-sm mb-2 ${
                              isHighPriorityTask
                                ? "text-rose-700/90"
                                : item.isRead
                                  ? "text-slate-500"
                                  : "text-slate-600"
                            }`}>
                              {item.message}
                            </p>
                            
                            <div className="flex items-center gap-2 text-xs">
                              <span className="flex items-center gap-1 text-slate-400">
                                <ClockIcon className="h-3 w-3" />
                                {formatTimeAgo(item.createdAt)}
                              </span>
                              {item.readAt && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span className="text-slate-400">
                                    Read {formatTimeAgo(item.readAt)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              type="button"
                              onClick={() => void markOne(item._id, !item.isRead)}
                              className={`p-2 rounded-lg transition-colors ${
                                item.isRead
                                  ? "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                  : "text-blue-600 hover:bg-blue-100"
                              }`}
                              title={item.isRead ? "Mark as unread" : "Mark as read"}
                            >
                              {item.isRead ? (
                                <BellSnoozeIcon className="h-4 w-4" />
                              ) : (
                                <CheckCircleIcon className="h-4 w-4" />
                              )}
                            </motion.button>
                          </div>
                        </div>

                        {/* Decorative Elements */}
                        <div className="absolute -bottom-2 -right-2 h-16 w-16 rounded-full bg-gradient-to-br from-slate-100 to-white opacity-50 blur-2xl" />
                      </div>
                    </motion.div>
                      );
                    })()
                  ))}
                </div>
              </AnimatePresence>
            )}
          </div>
        </motion.section>

        {/* Stats Summary - Optional */}
        {items.length > 0 && (
          <motion.section 
            variants={itemVariants}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            <motion.div
              variants={cardVariants}
              whileHover="hover"
              className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 p-4 shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white/20 p-2">
                  <BellIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-white/80">Total</p>
                  <p className="text-xl font-bold text-white">{items.length}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={cardVariants}
              whileHover="hover"
              className="rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 p-4 shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white/20 p-2">
                  <BellAlertIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-white/80">Unread</p>
                  <p className="text-xl font-bold text-white">{unreadCount}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={cardVariants}
              whileHover="hover"
              className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 p-4 shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white/20 p-2">
                  <CheckCircleIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-white/80">Read</p>
                  <p className="text-xl font-bold text-white">{items.length - unreadCount}</p>
                </div>
              </div>
            </motion.div>
          </motion.section>
        )}
      </div>

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </motion.div>
  );
}
