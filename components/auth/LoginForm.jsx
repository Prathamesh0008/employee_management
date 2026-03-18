"use client";

import { apiFetch } from "@/lib/client-api";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { EyeIcon, EyeSlashIcon, XMarkIcon } from "@heroicons/react/24/outline";

const SAVED_LOGIN_EMAIL_KEY = "ems:saved-login-email";

const ROLE_REDIRECT = {
  boss: "/boss/dashboard",
  manager: "/manager/dashboard",
  employee: "/employee/dashboard",
};

export default function LoginForm() {
  const router = useRouter();

  const [form, setForm] = useState({ email: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [nextPath, setNextPath] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
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

    try {
      const response = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Invalid email or password");
        setIsSubmitting(false);
        return;
      }

      if (rememberMe) {
        window.localStorage.setItem(SAVED_LOGIN_EMAIL_KEY, payload.email);
      } else {
        window.localStorage.removeItem(SAVED_LOGIN_EMAIL_KEY);
      }

      const rolePath = ROLE_REDIRECT[data.user?.role] || "/login";
      const destination = nextPath || rolePath;
      window.location.replace(destination);
    } catch {
      setError("Network error. Please check your connection.");
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#070517] px-4 py-8 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_58%,rgba(86,49,255,0.34),transparent_42%),radial-gradient(circle_at_22%_35%,rgba(67,35,209,0.2),transparent_36%),radial-gradient(circle_at_78%_64%,rgba(37,20,116,0.26),transparent_34%),linear-gradient(180deg,#09061c_0%,#070517_100%)]" />

      <div className="relative z-10 w-full max-w-[460px]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="rounded-[28px] border border-white/10 bg-[#161424]/88 p-8 shadow-[0_30px_90px_rgba(0,0,0,0.6)] backdrop-blur-xl"
        >
          <h1 className="text-[38px] font-semibold leading-none tracking-[-0.02em]">Sign in</h1>
          <p className="mt-3 text-sm text-white/60">Enter your account details.</p>

          <form className="mt-8 space-y-5" onSubmit={onSubmit} autoComplete="on">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-white/90">
                Email or username
              </label>
              <input
                type="email"
                name="email"
                id="email"
                required
                autoComplete="username"
                value={form.email}
                onChange={onChange}
                placeholder="you@company.com"
                className="h-11 w-full rounded-lg border border-[#4f41a8] bg-[#0f0d1c] px-4 text-sm text-white outline-none transition focus:border-[#7156ff] focus:shadow-[0_0_0_3px_rgba(113,86,255,0.22)]"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-white/90">
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
                  placeholder="........"
                  className="h-11 w-full rounded-lg border border-white/15 bg-[#0f0d1c] px-4 pr-10 text-sm text-white outline-none transition focus:border-[#7156ff] focus:shadow-[0_0_0_3px_rgba(113,86,255,0.22)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 transition hover:text-white"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <label className="flex items-start gap-2.5 pt-1">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="mt-[3px] h-4 w-4 rounded border border-white/25 bg-[#0f0d1c] text-[#7b61ff] focus:ring-[#7b61ff]"
              />
              <span className="text-sm leading-5 text-white/78">Keep me signed in</span>
            </label>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-center gap-2 rounded-lg border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
                >
                  <XMarkIcon className="h-5 w-5" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 h-11 w-full rounded-lg bg-gradient-to-r from-[#6b4eff] to-[#7a64ff] text-sm font-semibold text-white shadow-[0_12px_28px_rgba(88,58,255,0.45)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

        </motion.div>
      </div>
    </main>
  );
}
