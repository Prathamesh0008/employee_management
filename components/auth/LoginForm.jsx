"use client";

import { apiFetch } from "@/lib/client-api";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  EnvelopeIcon,
  KeyIcon,
  ArrowRightIcon,
  EyeIcon,
  EyeSlashIcon,
  BuildingOfficeIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const SAVED_LOGIN_EMAIL_KEY = "ems:saved-login-email";

const ROLE_REDIRECT = {
  boss: "/boss/dashboard",
  manager: "/manager/dashboard",
  employee: "/employee/dashboard",
};

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

export default function LoginForm() {
  const router = useRouter();

  const [form, setForm] = useState({ email: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [nextPath, setNextPath] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
    const next = new URLSearchParams(window.location.search).get("next") || "";
    setNextPath(next);
    const savedEmail = window.localStorage.getItem(SAVED_LOGIN_EMAIL_KEY) || "";

    if (savedEmail) {
      setForm((previous) => ({ ...previous, email: savedEmail }));
      setRememberMe(true);
    }

    const checkSession = async () => {
      try {
        const response = await apiFetch("/api/auth/me", { cache: "no-store" });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const rolePath = ROLE_REDIRECT[data.user?.role] || "/login";
        router.replace(next || rolePath);
      } catch {
        // Intentionally ignored: unauthenticated users should stay on login page.
      }
    };

    checkSession();
  }, [router]);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    if (error) setError("");
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      email: String(formData.get("email") || "").trim(),
      password: String(formData.get("password") || ""),
      rememberMe: rememberMe,
    };
    setForm(payload);

    try {
      const response = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Invalid email or password");
        return;
      }

      if (rememberMe) {
        window.localStorage.setItem(SAVED_LOGIN_EMAIL_KEY, payload.email);
      } else {
        window.localStorage.removeItem(SAVED_LOGIN_EMAIL_KEY);
      }

      // Show success state briefly before redirect
      setTimeout(() => {
        const rolePath = ROLE_REDIRECT[data.user?.role] || "/login";
        router.replace(nextPath || rolePath);
        router.refresh();
      }, 500);
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.main
      initial="hidden"
      animate={isLoaded ? "visible" : "hidden"}
      variants={containerVariants}
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 px-4"
    >
      {/* Animated Background Elements */}
      <motion.div
        variants={floatingAnimation}
        animate="animate"
        className="absolute left-10 top-20 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl"
      />
      <motion.div
        variants={floatingAnimation}
        animate="animate"
        className="absolute bottom-20 right-10 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl"
      />
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1 }}
        className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-3xl"
      />

      {/* Login Card */}
      <motion.div
        variants={itemVariants}
        className="relative w-full max-w-md"
      >
        {/* Decorative Elements */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="absolute -left-4 -top-4 z-10"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 shadow-lg">
            <BuildingOfficeIcon className="h-6 w-6 text-white" />
          </div>
        </motion.div>

        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80 backdrop-blur-xl shadow-2xl">
          {/* Header Gradient */}
          <div className="absolute top-0 h-2 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          
          <div className="p-8">
            {/* Header */}
            <motion.div variants={itemVariants} className="text-center">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Welcome Back
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                Sign in to access your employee dashboard
              </p>
            </motion.div>

            {/* Form */}
            <motion.form 
              variants={itemVariants}
              className="mt-8 space-y-5" 
              onSubmit={onSubmit}
              autoComplete="on"
            >
              {/* Email Field */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-200">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    name="email"
                    id="email"
                    required
                    autoComplete="username"
                    value={form.email}
                    onChange={onChange}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/80 py-2.5 pl-10 pr-4 text-slate-100 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="you@company.com"
                  />
                  <EnvelopeIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-200">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    id="password"
                    required
                    autoComplete="current-password"
                    value={form.password}
                    onChange={onChange}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/80 py-2.5 pl-10 pr-10 text-slate-100 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="........"
                    />
                  <KeyIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <motion.div 
                variants={itemVariants}
                className="flex items-center"
              >
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-300">Remember me</span>
                </label>
              </motion.div>

              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-600"
                  >
                    <XMarkIcon className="h-5 w-5" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative w-full overflow-hidden rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 font-medium text-white shadow-lg transition-all hover:from-indigo-700 hover:to-purple-700 disabled:opacity-70"
              >
                <AnimatePresence mode="wait">
                  {isSubmitting ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center justify-center gap-2"
                    >
                      <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Signing in...</span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="signin"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center justify-center gap-2"
                    >
                      <span>Sign in</span>
                      <ArrowRightIcon className="h-5 w-5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </motion.form>

            {/* Footer */}
            <motion.div 
              variants={itemVariants}
              className="mt-6 text-center text-sm text-slate-400"
            >
              <p>Demo credentials:</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs text-slate-300 ring-1 ring-slate-800">
                  boss@company.local
                </span>
                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs text-slate-300 ring-1 ring-slate-800">
                  manager@company.local
                </span>
                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs text-slate-300 ring-1 ring-slate-800">
                  employee01@company.local
                </span>
              </div>
              <p className="mt-2 text-xs">
                Password: use the seeded password from <code>.env.local</code>
              </p>
            </motion.div>
          </div>
        </div>

        {/* Bottom Decoration */}
        <motion.div
          variants={itemVariants}
          className="mt-4 text-center text-sm text-white/60"
        >
          Copyright 2024 Employee Management System. All rights reserved.
        </motion.div>
      </motion.div>
    </motion.main>
  );
}
