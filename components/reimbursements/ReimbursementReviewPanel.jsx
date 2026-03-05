"use client";

import { apiFetch } from "@/lib/client-api";
import InvoicePreviewModal from "@/components/reimbursements/InvoicePreviewModal";
import { useCallback, useEffect, useMemo, useState } from "react";

const AUTO_REFRESH_MS = 5000;

const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
};

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function formatStatusLabel(status) {
  const value = String(status || "");
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "-";
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "-";
}

export default function ReimbursementReviewPanel({ initialReimbursements = [] }) {
  const [reimbursements, setReimbursements] = useState(initialReimbursements);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [reviewerComment, setReviewerComment] = useState("");
  const [previewInvoice, setPreviewInvoice] = useState(null);

  const loadReimbursements = useCallback(async ({ silent = false, status = filter } = {}) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const query = new URLSearchParams({ limit: "200" });
      if (status && status !== "all") {
        query.set("status", status);
      }

      const response = await apiFetch(`/api/reimbursements?${query.toString()}`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load reimbursements");
      }

      setReimbursements(data.reimbursements || []);
    } catch (loadError) {
      if (!silent) {
        setError(loadError.message || "Unable to load reimbursements");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [filter]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadReimbursements({ silent: true });
      }
    }, AUTO_REFRESH_MS);

    const refreshOnVisible = () => {
      if (document.visibilityState === "visible") {
        void loadReimbursements({ silent: true });
      }
    };

    window.addEventListener("focus", refreshOnVisible);
    document.addEventListener("visibilitychange", refreshOnVisible);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", refreshOnVisible);
      document.removeEventListener("visibilitychange", refreshOnVisible);
    };
  }, [loadReimbursements]);

  useEffect(() => {
    void loadReimbursements({ status: filter });
  }, [filter, loadReimbursements]);

  const stats = useMemo(() => {
    return reimbursements.reduce(
      (acc, item) => {
        acc.total += 1;
        acc[item.status] += 1;
        return acc;
      },
      { total: 0, pending: 0, approved: 0, rejected: 0 },
    );
  }, [reimbursements]);

  const openInvoice = (invoice) => setPreviewInvoice(invoice || null);

  const openReviewModal = (item) => {
    setSelectedItem(item);
    setReviewerComment(item.reviewerComment || "");
    setError("");
  };

  const closeReviewModal = () => {
    if (actionLoading) {
      return;
    }

    setSelectedItem(null);
    setReviewerComment("");
  };

  const reviewRequest = async (status) => {
    if (!selectedItem?._id) {
      return;
    }

    setActionLoading(status);
    setError("");

    try {
      const response = await apiFetch(`/api/reimbursements/${selectedItem._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          reviewerComment,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to review reimbursement");
      }

      setSelectedItem(null);
      setReviewerComment("");
      await loadReimbursements({ silent: true, status: filter });
    } catch (reviewError) {
      setError(reviewError.message || "Unable to review reimbursement");
    } finally {
      setActionLoading("");
    }
  };

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold text-slate-900">Reimbursement Review</h1>
        <p className="mt-1 text-sm text-slate-600">
          Check employee invoices and approve or reject reimbursement requests.
        </p>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Visible Requests</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Pending</p>
          <p className="mt-1 text-2xl font-semibold text-amber-600">{stats.pending}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Approved</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-600">{stats.approved}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Rejected</p>
          <p className="mt-1 text-2xl font-semibold text-rose-600">{stats.rejected}</p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Requests</h2>
          <div className="flex gap-2">
            {["all", "pending", "approved", "rejected"].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                className={`rounded px-3 py-2 text-sm font-medium ${
                  filter === option
                    ? "bg-indigo-600 text-white"
                    : "border border-slate-300 text-slate-700"
                }`}
              >
                {option === "all" ? "All" : formatStatusLabel(option)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Loading reimbursements...</p>
        ) : (
          <>
            <div className="mt-4 space-y-3 lg:hidden">
              {reimbursements.map((item) => (
                <div key={item._id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="text-xs text-slate-600">{item.user?.name || "Unknown Employee"}</p>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-1 text-xs font-medium ${
                        STATUS_STYLES[item.status] || STATUS_STYLES.pending
                      }`}
                    >
                      {formatStatusLabel(item.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{formatCurrency(item.amount)}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.description}</p>
                  <p className="mt-1 text-xs text-slate-500">Submitted: {formatDate(item.createdAt)}</p>
                  {item.reviewerComment ? (
                    <p className="mt-1 text-xs text-slate-600">Note: {item.reviewerComment}</p>
                  ) : null}
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => openInvoice(item.invoice)}
                      className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium"
                    >
                      View Invoice
                    </button>
                    {item.status === "pending" ? (
                      <button
                        type="button"
                        onClick={() => openReviewModal(item)}
                        className="rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white"
                      >
                        Review
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 hidden overflow-x-auto lg:block">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Employee</th>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">Submitted</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Reviewer Note</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reimbursements.map((item) => (
                    <tr key={item._id} className="border-b border-slate-100">
                      <td className="px-3 py-2">
                        <p className="font-medium text-slate-900">{item.user?.name || "Unknown"}</p>
                        <p className="text-xs text-slate-500">{item.user?.email || "-"}</p>
                      </td>
                      <td className="px-3 py-2">
                        <p className="font-medium text-slate-900">{item.title}</p>
                        <p className="max-w-xs truncate text-xs text-slate-500">{item.description}</p>
                      </td>
                      <td className="px-3 py-2">{formatCurrency(item.amount)}</td>
                      <td className="px-3 py-2">{formatDate(item.createdAt)}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full border px-2 py-1 text-xs font-medium ${
                            STATUS_STYLES[item.status] || STATUS_STYLES.pending
                          }`}
                        >
                          {formatStatusLabel(item.status)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-600">
                        {item.reviewerComment || "-"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openInvoice(item.invoice)}
                            className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium"
                          >
                            View Invoice
                          </button>
                          {item.status === "pending" ? (
                            <button
                              type="button"
                              onClick={() => openReviewModal(item)}
                              className="rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white"
                            >
                              Review
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {reimbursements.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No reimbursement requests found.</p>
            ) : null}
          </>
        )}
      </section>

      {selectedItem ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          onClick={closeReviewModal}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Review Reimbursement</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {selectedItem.user?.name || "Unknown"} requested {formatCurrency(selectedItem.amount)}.
                </p>
              </div>
              <button
                type="button"
                onClick={closeReviewModal}
                className="rounded border border-slate-300 px-3 py-1 text-sm"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <div>
                <p className="font-medium text-slate-900">{selectedItem.title}</p>
                <p className="mt-1 text-slate-600">{selectedItem.description}</p>
              </div>
              <p>Submitted: {formatDate(selectedItem.createdAt)}</p>
              <button
                type="button"
                onClick={() => openInvoice(selectedItem.invoice)}
                className="rounded border border-slate-300 px-3 py-2 text-sm font-medium"
              >
                Open Invoice
              </button>
              <div>
                <label className="text-sm font-medium text-slate-700">Review Comment</label>
                <textarea
                  value={reviewerComment}
                  onChange={(event) => setReviewerComment(event.target.value)}
                  rows={4}
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                  placeholder="Optional note for employee"
                />
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={Boolean(actionLoading)}
                onClick={() => void reviewRequest("rejected")}
                className="rounded border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 disabled:opacity-50"
              >
                {actionLoading === "rejected" ? "Rejecting..." : "Reject"}
              </button>
              <button
                type="button"
                disabled={Boolean(actionLoading)}
                onClick={() => void reviewRequest("approved")}
                className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:bg-emerald-300"
              >
                {actionLoading === "approved" ? "Approving..." : "Approve"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <InvoicePreviewModal
        invoice={previewInvoice}
        title="Review Invoice"
        onClose={() => setPreviewInvoice(null)}
      />
    </div>
  );
}
