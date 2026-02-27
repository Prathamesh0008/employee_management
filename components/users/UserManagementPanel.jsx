"use client";

import { apiFetch } from "@/lib/client-api";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlusIcon,
  UsersIcon,
  BriefcaseIcon,
  EnvelopeIcon,
  KeyIcon,
  UserCircleIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  SparklesIcon,
  ArrowPathIcon,
  FunnelIcon,
  SunIcon,
  MoonIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  PhoneIcon,
  IdentificationIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

const GENDER_OPTIONS = ["male", "female", "other"];

const DEFAULT_FORM = {
  name: "",
  email: "",
  password: "",
  role: "employee",
  gender: "male",
  department: "General",
  designation: "Staff",
  employeeCode: "",
  phone: "",
  baseSalary: 0,
  weeklyOffDays: [0],
};

const ROLE_STYLES = {
  admin: "bg-purple-100 text-purple-700 border-purple-200",
  manager: "bg-blue-100 text-blue-700 border-blue-200",
  employee: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const GENDER_STYLES = {
  male: "bg-blue-100 text-blue-700 border-blue-200",
  female: "bg-pink-100 text-pink-700 border-pink-200",
  other: "bg-purple-100 text-purple-700 border-purple-200",
};

function getShiftByGender(gender) {
  return gender === "female" ? "women-day" : "men-day";
}

function getShiftLabelByGender(gender) {
  return getShiftByGender(gender) === "women-day"
    ? "Women Shift (9 AM - 6 PM)"
    : "Men Shift (10 AM - 7 PM)";
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

export default function UserManagementPanel() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [editUserId, setEditUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [roleFilter, setRoleFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await apiFetch("/api/users?limit=200", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load users");
      }

      setUsers(data.users || []);
      setSuccess("Users loaded successfully!");
      setTimeout(() => setSuccess(""), 2000);
    } catch (loadError) {
      setError(loadError.message || "Unable to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  // Filter users based on search and role
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch = searchTerm === "" || 
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  const stats = useMemo(() => {
    const total = users.length;
    const managers = users.filter((user) => user.role === "manager").length;
    const employees = users.filter((user) => user.role === "employee").length;
    const women = users.filter((user) => user.gender === "female").length;
    const totalSalary = users.reduce((acc, user) => acc + (user.baseSalary || 0), 0);

    return { total, managers, employees, women, totalSalary };
  }, [users]);

  const onInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => {
      if (name === "baseSalary") {
        return { ...prev, baseSalary: Number(value) || 0 };
      }
      return { ...prev, [name]: value };
    });
    if (error) setError("");
  };

  const onWeeklyOffChange = (day, checked) => {
    setForm((prev) => {
      const set = new Set(prev.weeklyOffDays || []);
      if (checked) {
        set.add(day);
      } else {
        set.delete(day);
      }
      return { ...prev, weeklyOffDays: [...set].sort() };
    });
  };

  const resetForm = () => {
    setForm(DEFAULT_FORM);
    setEditUserId("");
  };

  const submitCreate = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await apiFetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create user");
      }

      setSuccess("User created successfully!");
      resetForm();
      await loadUsers();
      setTimeout(() => setSuccess(""), 3000);
    } catch (submitError) {
      setError(submitError.message || "Unable to create user");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (user) => {
    setEditUserId(user._id);
    setForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.role || "employee",
      gender: user.gender || "male",
      department: user.department || "General",
      designation: user.designation || "Staff",
      employeeCode: user.employeeCode || "",
      phone: user.phone || "",
      baseSalary: Number(user.baseSalary) || 0,
      weeklyOffDays: Array.isArray(user.weeklyOffDays) ? user.weeklyOffDays : [0],
    });
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitEdit = async (event) => {
    event.preventDefault();

    if (!editUserId) return;

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        name: form.name,
        role: form.role,
        gender: form.gender,
        department: form.department,
        designation: form.designation,
        employeeCode: form.employeeCode,
        phone: form.phone,
        baseSalary: form.baseSalary,
        weeklyOffDays: form.weeklyOffDays,
      };

      const response = await apiFetch(`/api/users/${editUserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update user");
      }

      setSuccess("User profile updated successfully!");
      resetForm();
      await loadUsers();
      setTimeout(() => setSuccess(""), 3000);
    } catch (updateError) {
      setError(updateError.message || "Unable to update user");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 p-3 sm:p-4 md:p-6"
      initial="hidden"
      animate={isLoaded ? "visible" : "hidden"}
      variants={containerVariants}
    >
      {/* Animated Background Elements */}
      <motion.div
        variants={floatingAnimation}
        animate="animate"
        className="fixed left-0 top-20 h-64 w-64 rounded-full bg-indigo-500/5 blur-3xl"
      />
      <motion.div
        variants={floatingAnimation}
        animate="animate"
        className="fixed bottom-20 right-0 h-80 w-80 rounded-full bg-purple-500/5 blur-3xl"
      />

      <div className="relative space-y-4 sm:space-y-6">
        {/* Header Section with Glass Effect */}
        <motion.section 
          variants={itemVariants}
          className="relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-xl border border-white/20 shadow-xl p-4 sm:p-6"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/5 to-purple-600/5" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Employee Profile Master
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Manage users, department/designation, and default shift rules
              </p>
            </div>
            <div className="flex items-center gap-2">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-sm border border-slate-200"
              >
                <UsersIcon className="h-4 w-4 text-indigo-500" />
                <span className="text-xs sm:text-sm font-medium text-slate-700">
                  {stats.total} Employees
                </span>
              </motion.div>
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

        {/* Stats Cards */}
        <motion.section 
          variants={itemVariants}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
        >
          {[
            { icon: UsersIcon, label: "Total Users", value: stats.total, color: "indigo", gradient: "from-indigo-500 to-purple-500" },
            { icon: BriefcaseIcon, label: "Managers", value: stats.managers, color: "blue", gradient: "from-blue-500 to-indigo-500" },
            { icon: UserCircleIcon, label: "Employees", value: stats.employees, color: "emerald", gradient: "from-emerald-500 to-green-500" },
            { icon: SunIcon, label: "Women", value: stats.women, color: "pink", gradient: "from-pink-500 to-rose-500" },
            { icon: CurrencyDollarIcon, label: "Total Salary", value: `$${stats.totalSalary.toLocaleString()}`, color: "amber", gradient: "from-amber-500 to-orange-500" },
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              variants={cardVariants}
              whileHover="hover"
              whileTap="tap"
              className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
              <div className="relative">
                <div className={`inline-flex rounded-xl bg-${stat.color}-50 p-2.5`}>
                  <stat.icon className={`h-5 w-5 text-${stat.color}-600`} />
                </div>
                <p className="mt-3 text-xs font-medium text-slate-400 uppercase tracking-wider">{stat.label}</p>
                <p className={`mt-1 text-xl sm:text-2xl font-bold text-${stat.color}-600`}>{stat.value}</p>
              </div>
              <div className="absolute -bottom-2 -right-2 h-16 w-16 rounded-full bg-gradient-to-br from-slate-100 to-white opacity-50 blur-2xl" />
            </motion.div>
          ))}
        </motion.section>

        {/* Create/Edit User Form */}
        <motion.section 
          variants={itemVariants}
          className="relative overflow-hidden rounded-2xl bg-white shadow-xl"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-purple-50/50" />
          
          <div className="relative p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 p-2.5 shadow-lg">
                {editUserId ? <PencilSquareIcon className="h-5 w-5 text-white" /> : <UserPlusIcon className="h-5 w-5 text-white" />}
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-800">
                  {editUserId ? "Edit User Profile" : "Create New User"}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  {editUserId ? "Update employee information" : "Add a new employee to the system"}
                </p>
              </div>
            </div>

            <form onSubmit={editUserId ? submitEdit : submitCreate} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* Basic Information */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                    <UserCircleIcon className="h-3 w-3" />
                    Full Name
                  </label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={onInputChange}
                    placeholder="John Doe"
                    required
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                    <EnvelopeIcon className="h-3 w-3" />
                    Email Address
                  </label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={onInputChange}
                    placeholder="john@company.com"
                    required
                    disabled={Boolean(editUserId)}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all duration-200 disabled:bg-slate-50 disabled:text-slate-500"
                  />
                </div>

                {!editUserId && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                      <KeyIcon className="h-3 w-3" />
                      Password
                    </label>
                    <input
                      name="password"
                      type="password"
                      value={form.password}
                      onChange={onInputChange}
                      placeholder="••••••••"
                      required
                      minLength={8}
                      className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                    />
                  </div>
                )}

                {/* Role and Gender */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                    <BriefcaseIcon className="h-3 w-3" />
                    Role
                  </label>
                  <select
                    name="role"
                    value={form.role}
                    onChange={onInputChange}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                    <SunIcon className="h-3 w-3" />
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={form.gender}
                    onChange={onInputChange}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                  >
                    {GENDER_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item.charAt(0).toUpperCase() + item.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    Shift Assignment
                  </label>
                  <div className="rounded-lg border border-slate-200 bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-2.5 text-sm text-indigo-700 font-medium">
                    {getShiftLabelByGender(form.gender)}
                  </div>
                </div>

                {/* Department and Designation */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                    <BuildingOfficeIcon className="h-3 w-3" />
                    Department
                  </label>
                  <input
                    name="department"
                    value={form.department}
                    onChange={onInputChange}
                    placeholder="Engineering"
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                    <BriefcaseIcon className="h-3 w-3" />
                    Designation
                  </label>
                  <input
                    name="designation"
                    value={form.designation}
                    onChange={onInputChange}
                    placeholder="Software Engineer"
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                  />
                </div>

                {/* Employee Code and Phone */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                    <IdentificationIcon className="h-3 w-3" />
                    Employee Code
                  </label>
                  <input
                    name="employeeCode"
                    value={form.employeeCode}
                    onChange={onInputChange}
                    placeholder="EMP001"
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                    <PhoneIcon className="h-3 w-3" />
                    Phone Number
                  </label>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={onInputChange}
                    placeholder="+1 234 567 8900"
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                    <CurrencyDollarIcon className="h-3 w-3" />
                    Base Salary
                  </label>
                  <input
                    name="baseSalary"
                    type="number"
                    min={0}
                    value={form.baseSalary}
                    onChange={onInputChange}
                    placeholder="50000"
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                  />
                </div>

                {/* Weekly Off Days */}
                <div className="md:col-span-3">
                  <div className="rounded-lg border border-slate-200 p-4">
                    <p className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-indigo-500" />
                      Weekly Off Days
                    </p>
                    <div className="flex flex-wrap gap-4">
                      {[
                        { d: 0, label: "Sunday" },
                        { d: 1, label: "Monday" },
                        { d: 2, label: "Tuesday" },
                        { d: 3, label: "Wednesday" },
                        { d: 4, label: "Thursday" },
                        { d: 5, label: "Friday" },
                        { d: 6, label: "Saturday" },
                      ].map((item) => (
                        <label key={item.d} className="inline-flex items-center gap-2 cursor-pointer group">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={form.weeklyOffDays.includes(item.d)}
                              onChange={(event) => onWeeklyOffChange(item.d, event.target.checked)}
                              className="sr-only"
                            />
                            <div className={`w-4 h-4 border-2 rounded transition-all duration-200 ${
                              form.weeklyOffDays.includes(item.d)
                                ? 'bg-indigo-500 border-indigo-500'
                                : 'border-slate-300 group-hover:border-indigo-300'
                            }`}>
                              {form.weeklyOffDays.includes(item.d) && (
                                <svg className="w-3 h-3 text-white mx-auto" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          </div>
                          <span className={`text-sm ${
                            form.weeklyOffDays.includes(item.d) ? 'text-indigo-600 font-medium' : 'text-slate-600'
                          }`}>
                            {item.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4">
                <motion.button
                  type="submit"
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  disabled={submitting}
                  className="relative overflow-hidden rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg disabled:opacity-50 transition-all duration-300"
                >
                  <span className="relative flex items-center justify-center gap-2">
                    {submitting ? (
                      <>
                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        {editUserId ? "Updating..." : "Creating..."}
                      </>
                    ) : (
                      <>
                        {editUserId ? <PencilSquareIcon className="h-4 w-4" /> : <UserPlusIcon className="h-4 w-4" />}
                        {editUserId ? "Update User" : "Create User"}
                      </>
                    )}
                  </span>
                </motion.button>

                {editUserId && (
                  <motion.button
                    type="button"
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={resetForm}
                    className="rounded-lg border border-slate-200 bg-white px-6 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancel Edit
                  </motion.button>
                )}
              </div>
            </form>
          </div>
        </motion.section>

        {/* Users List Section */}
        <motion.section 
          variants={itemVariants}
          className="relative overflow-hidden rounded-2xl bg-white shadow-xl"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-pink-50/50" />
          
          <div className="relative p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 p-2.5 shadow-lg">
                  <UsersIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-800">Employee Directory</h2>
                  <p className="text-xs sm:text-sm text-slate-500">Manage and view all employees</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Search Input */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-64 rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all duration-200"
                  />
                  <UserCircleIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>

                {/* Filter Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <FunnelIcon className="h-4 w-4" />
                  Filter
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => void loadUsers()}
                  className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </motion.button>
              </div>
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mb-4"
                >
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="w-full sm:w-auto rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                  >
                    <option value="all">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="employee">Employee</option>
                  </select>
                </motion.div>
              )}
            </AnimatePresence>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full border-4 border-slate-200 border-t-purple-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <SparklesIcon className="h-5 w-5 text-purple-500 animate-pulse" />
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Mobile View - Cards */}
                <div className="space-y-3 lg:hidden">
                  <AnimatePresence mode="popLayout">
                    {filteredUsers.map((user, index) => (
                      <motion.div
                        key={user._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.02 }}
                        className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-white to-slate-50 border border-slate-100 p-4 shadow-md hover:shadow-lg transition-all duration-300"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="relative">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                                {user.name?.charAt(0) || "U"}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-800">{user.name}</p>
                                <p className="text-xs text-slate-400">{user.email}</p>
                              </div>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${ROLE_STYLES[user.role] || ROLE_STYLES.employee}`}>
                              {user.role}
                            </span>
                          </div>
                          
                          <div className="ml-12 space-y-1">
                            <div className="flex items-center gap-2 text-xs">
                              <BuildingOfficeIcon className="h-3 w-3 text-slate-400" />
                              <span className="text-slate-600">{user.department || "General"} • {user.designation || "Staff"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <IdentificationIcon className="h-3 w-3 text-slate-400" />
                              <span className="text-slate-600">{user.employeeCode || "No code"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${GENDER_STYLES[user.gender] || GENDER_STYLES.male}`}>
                                {user.gender}
                              </span>
                              <span className="text-slate-400">•</span>
                              <span className="text-slate-600">{getShiftLabelByGender(user.gender)}</span>
                            </div>
                            {user.baseSalary > 0 && (
                              <div className="flex items-center gap-2 text-xs">
                                <CurrencyDollarIcon className="h-3 w-3 text-slate-400" />
                                <span className="text-slate-600">${user.baseSalary.toLocaleString()}</span>
                              </div>
                            )}
                          </div>

                          <div className="mt-3 flex justify-end">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              type="button"
                              onClick={() => startEdit(user)}
                              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
                            >
                              <PencilSquareIcon className="h-3 w-3" />
                              Edit Profile
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-hidden rounded-xl border border-slate-100">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-slate-200">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Department</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Designation</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Shift</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Salary</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <AnimatePresence>
                        {filteredUsers.map((user, index) => (
                          <motion.tr
                            key={user._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ delay: index * 0.03 }}
                            whileHover={{ backgroundColor: "rgba(241, 245, 249, 0.5)" }}
                            className="group transition-colors duration-200"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                                  {user.name?.charAt(0) || "U"}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-slate-800">{user.name}</p>
                                  <p className="text-xs text-slate-400">{user.employeeCode || "-"}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm text-slate-600">{user.email}</p>
                              <p className="text-xs text-slate-400">{user.phone || "-"}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${ROLE_STYLES[user.role] || ROLE_STYLES.employee}`}>
                                {user.role}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">{user.department || "-"}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{user.designation || "-"}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${GENDER_STYLES[user.gender]}`}>
                                {getShiftLabelByGender(user.gender)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-emerald-600">
                              ${user.baseSalary?.toLocaleString() || 0}
                            </td>
                            <td className="px-4 py-3">
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                type="button"
                                onClick={() => startEdit(user)}
                                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
                              >
                                <PencilSquareIcon className="h-3 w-3" />
                                Edit
                              </motion.button>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>

                {/* Empty State */}
                {filteredUsers.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-12"
                  >
                    <div className="rounded-full bg-slate-100 p-4 mb-3">
                      <UsersIcon className="h-8 w-8 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">No users found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchTerm || roleFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first user above'}
                    </p>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </motion.section>
      </div>
    </motion.div>
  );
}