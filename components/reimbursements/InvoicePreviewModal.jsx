"use client";

import Image from "next/image";

function getInvoiceType(invoice) {
  if (!invoice?.mimeType) {
    return "unknown";
  }

  if (invoice.mimeType === "application/pdf") {
    return "pdf";
  }

  if (invoice.mimeType.startsWith("image/")) {
    return "image";
  }

  return "unknown";
}

export default function InvoicePreviewModal({ invoice, title, onClose }) {
  if (!invoice?.dataUrl) {
    return null;
  }

  const invoiceType = getInvoiceType(invoice);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{title || "Invoice Preview"}</h3>
            <p className="text-xs text-slate-500">{invoice.fileName || "Invoice file"}</p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={invoice.dataUrl}
              download={invoice.fileName || "invoice"}
              className="rounded border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
            >
              Download
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-100 p-4">
          {invoiceType === "pdf" ? (
            <iframe
              src={invoice.dataUrl}
              title={invoice.fileName || "Invoice PDF"}
              className="h-full min-h-[70vh] w-full rounded-2xl border border-slate-200 bg-white"
            />
          ) : null}

          {invoiceType === "image" ? (
            <div className="flex min-h-[70vh] items-center justify-center">
              <Image
                src={invoice.dataUrl}
                alt={invoice.fileName || "Invoice"}
                width={1200}
                height={1600}
                unoptimized
                className="max-h-[70vh] w-auto max-w-full rounded-2xl border border-slate-200 bg-white object-contain shadow-sm"
              />
            </div>
          ) : null}

          {invoiceType === "unknown" ? (
            <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
              <p className="text-sm text-slate-600">
                Preview is not available for this invoice type.
              </p>
              <a
                href={invoice.dataUrl}
                download={invoice.fileName || "invoice"}
                className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
              >
                Download Invoice
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
