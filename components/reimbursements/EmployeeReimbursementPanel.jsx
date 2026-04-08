"use client";

import { apiFetch } from "@/lib/client-api";
import InvoicePreviewModal from "@/components/reimbursements/InvoicePreviewModal";
import { useCallback, useEffect, useMemo, useState } from "react";

const AUTO_REFRESH_MS = 5000;
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

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

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read invoice file"));
    reader.readAsDataURL(file);
  });
}

export default function EmployeeReimbursementPanel({ initialReimbursements = [] }) {
  const [reimbursements, setReimbursements] = useState(initialReimbursements);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    amount: "",
  });
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [previewInvoice, setPreviewInvoice] = useState(null);

  const loadReimbursements = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const response = await apiFetch("/api/reimbursements?limit=100", { cache: "no-store" });
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
  }, []);

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

  const onInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onInvoiceChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      setInvoiceFile(null);
      return;
    }

    if (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Upload a PDF, JPG, PNG, or WEBP invoice");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("Invoice file must be 2 MB or smaller");
      return;
    }

    setInvoiceFile(file);
    setError("");
  };

  const submitReimbursement = async (event) => {
    event.preventDefault();

    if (!invoiceFile) {
      setError("Invoice file is required");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const dataUrl = await fileToDataUrl(invoiceFile);
      const response = await apiFetch("/api/reimbursements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          amount: Number(form.amount),
          invoice: {
            fileName: invoiceFile.name,
            mimeType: invoiceFile.type,
            dataUrl,
          },
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit reimbursement");
      }

      setForm({
        title: "",
        description: "",
        amount: "",
      });
      setInvoiceFile(null);
      setSuccess("Reimbursement request submitted");
      await loadReimbursements({ silent: true });
    } catch (submitError) {
      setError(submitError.message || "Unable to submit reimbursement");
    } finally {
      setSubmitting(false);
    }
  };

  const openInvoice = (invoice) => setPreviewInvoice(invoice || null);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold text-slate-900">Invoice Reimbursement</h1>
        <p className="mt-1 text-sm text-slate-600">
          Upload your invoice, track approval, and get reimbursed after boss review.
        </p>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-green-600">{success}</p> : null}

      <section className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Total Requests</p>
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
        <h2 className="text-lg font-semibold text-slate-900">Submit Invoice</h2>

        <form onSubmit={submitReimbursement} className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            name="title"
            value={form.title}
            onChange={onInputChange}
            placeholder="Expense title"
            required
            className="rounded border border-slate-300 px-3 py-2"
          />
          <input
            name="amount"
            type="number"
            min="1"
            step="0.01"
            value={form.amount}
            onChange={onInputChange}
            placeholder="Amount"
            required
            className="rounded border border-slate-300 px-3 py-2"
          />
          <textarea
            name="description"
            value={form.description}
            onChange={onInputChange}
            placeholder="Expense description"
            rows={4}
            required
            className="rounded border border-slate-300 px-3 py-2 md:col-span-2"
          />
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Invoice File</label>
            <input
              type="file"
              accept=".pdf,image/png,image/jpeg,image/webp"
              onChange={onInvoiceChange}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
            <p className="mt-1 text-xs text-slate-500">
              Accepted: PDF, JPG, PNG, WEBP. Max size: 2 MB.
            </p>
            {invoiceFile ? (
              <p className="mt-1 text-xs text-slate-600">Selected: {invoiceFile.name}</p>
            ) : null}
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-[#A346FF] px-4 py-2 text-sm font-medium text-white disabled:bg-[#A346FF]"
            >
              {submitting ? "Submitting..." : "Submit Reimbursement"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">My Requests</h2>
          <button
            type="button"
            onClick={() => void loadReimbursements()}
            className="rounded border border-slate-300 px-3 py-2 text-sm"
          >
            Refresh
          </button>
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
                      <p className="mt-1 text-xs text-slate-500">{item.description}</p>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-1 text-xs font-medium ${
                        STATUS_STYLES[item.status] || STATUS_STYLES.pending
                      }`}
                    >
                      {formatStatusLabel(item.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-800">
                    {formatCurrency(item.amount)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Submitted: {formatDate(item.createdAt)}</p>
                  {item.reviewerComment ? (
                    <p className="mt-1 text-xs text-slate-600">
                      Review note: {item.reviewerComment}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => openInvoice(item.invoice)}
                    className="mt-3 rounded border border-slate-300 px-3 py-1.5 text-xs font-medium"
                  >
                    View Invoice
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 hidden overflow-x-auto lg:block">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">Submitted</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Reviewer Note</th>
                    <th className="px-3 py-2">Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {reimbursements.map((item) => (
                    <tr key={item._id} className="border-b border-slate-100">
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
                        <button
                          type="button"
                          onClick={() => openInvoice(item.invoice)}
                          className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium"
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {reimbursements.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No reimbursement requests yet.</p>
            ) : null}
          </>
        )}
      </section>

      <InvoicePreviewModal
        invoice={previewInvoice}
        title="Invoice Preview"
        onClose={() => setPreviewInvoice(null)}
      />
    </div>
  );
}

