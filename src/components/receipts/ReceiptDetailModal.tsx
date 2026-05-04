"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { daysOld } from "@/types";
import type { Receipt, ReceiptCategory } from "@/types";

const CATEGORIES: ReceiptCategory[] = ["meals", "lodging", "transit", "other"];
const CURRENCIES = ["USD", "CAD"];

const categoryEmoji: Record<string, string> = {
  meals: "\u{1F37D}\uFE0F", lodging: "\u{1F3E8}", transit: "\u{1F697}", other: "\u{1F4C4}",
};
const sourceLabel: Record<string, string> = {
  photo: "\u{1F4F7} Photo", bank_transaction: "\u{1F3E6} Bank Transaction",
  manual: "\u270D\uFE0F Manual Entry", email: "\u{1F4E7} Email", concur: "\u2197\uFE0F Concur",
};

export default function ReceiptDetailModal({
  receipt,
  onClose,
  onUpdated,
  initialEditing = false,
}: {
  receipt: Receipt;
  onClose: () => void;
  onUpdated?: (updated: Partial<Receipt>) => void;
  initialEditing?: boolean;
}) {
  const router = useRouter();
  const days = daysOld(receipt.transaction_date);
  const [imageFullscreen, setImageFullscreen] = useState(false);
  const [isEditing, setIsEditing] = useState(initialEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    vendor_name: receipt.vendor_name,
    transaction_date: receipt.transaction_date,
    amount: String(receipt.amount),
    currency: receipt.currency,
    category: receipt.category as ReceiptCategory,
    notes: receipt.notes ?? "",
  });

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  async function saveEdit() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        vendor_name: draft.vendor_name,
        transaction_date: draft.transaction_date,
        amount: parseFloat(draft.amount),
        currency: draft.currency,
        category: draft.category,
        notes: draft.notes,
      };
      const res = await fetch("/api/receipts/" + receipt.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      onUpdated?.(payload);
      setIsEditing(false);
      router.refresh();
    } catch (e: any) {
      setError(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div className="bg-gray-50 rounded-xl p-3">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
        {children}
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

        <div className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
          style={{ maxHeight: "min(560px, 88svh)" }}>

          {/* Header */}
          <div className="bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">{categoryEmoji[receipt.category] ?? "\u{1F4C4}"}</span>
              <div>
                <p className="text-sm font-bold text-gray-900 leading-tight">
                  {isEditing ? "Edit Receipt" : receipt.vendor_name}
                </p>
                {!isEditing && (
                  <p className="text-[11px] text-gray-400">
                    {receipt.category} \u00B7 {receipt.source.replace(/_/g, " ")}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 text-xs font-semibold text-gray-600 hover:bg-gray-200 transition-colors">
                  Edit
                </button>
              )}
              <button onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 2l8 8M10 2L2 10" stroke="#374151" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Body — scrollable only in edit mode */}
          <div className={isEditing ? "overflow-y-auto" : "overflow-hidden"}
            style={{ maxHeight: "min(460px, calc(88svh - 64px))" }}>
            <div className="px-5 py-4 space-y-3">

              {isEditing ? (
                /* ── Edit form ── */
                <>
                  <Field label="Vendor / Merchant">
                    <input
                      className="w-full bg-transparent text-sm font-semibold text-gray-800 outline-none border-b border-gray-300 focus:border-brand-cyan pb-0.5"
                      value={draft.vendor_name}
                      onChange={e => setDraft(d => ({ ...d, vendor_name: e.target.value }))}
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Amount">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        className="w-full bg-transparent text-sm font-semibold text-gray-800 outline-none border-b border-gray-300 focus:border-brand-cyan pb-0.5"
                        value={draft.amount}
                        onChange={e => setDraft(d => ({ ...d, amount: e.target.value }))}
                      />
                    </Field>
                    <Field label="Currency">
                      <select
                        className="w-full bg-transparent text-sm font-semibold text-gray-800 outline-none border-b border-gray-300 focus:border-brand-cyan pb-0.5"
                        value={draft.currency}
                        onChange={e => setDraft(d => ({ ...d, currency: e.target.value }))}>
                        {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </Field>
                  </div>

                  <Field label="Date">
                    <input
                      type="date"
                      className="w-full bg-transparent text-sm font-semibold text-gray-800 outline-none border-b border-gray-300 focus:border-brand-cyan pb-0.5"
                      value={draft.transaction_date}
                      onChange={e => setDraft(d => ({ ...d, transaction_date: e.target.value }))}
                    />
                  </Field>

                  <Field label="Category">
                    <select
                      className="w-full bg-transparent text-sm font-semibold text-gray-800 outline-none border-b border-gray-300 focus:border-brand-cyan pb-0.5"
                      value={draft.category}
                      onChange={e => setDraft(d => ({ ...d, category: e.target.value as ReceiptCategory }))}>
                      {CATEGORIES.map(c => (
                        <option key={c} value={c}>{categoryEmoji[c]} {c}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Notes">
                    <textarea
                      rows={2}
                      className="w-full bg-transparent text-sm text-gray-800 outline-none border-b border-gray-300 focus:border-brand-cyan pb-0.5 resize-none"
                      value={draft.notes}
                      onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
                    />
                  </Field>

                  {error && (
                    <p className="text-xs text-red-500 text-center">{error}</p>
                  )}

                  <div className="flex gap-3 pt-1 pb-2">
                    <button
                      onClick={() => { setIsEditing(false); setError(null); }}
                      className="flex-1 py-2.5 rounded-xl bg-gray-100 text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors">
                      Cancel
                    </button>
                    <button
                      onClick={saveEdit}
                      disabled={saving}
                      className="flex-1 py-2.5 rounded-xl bg-brand-cyan text-sm font-bold text-brand-navy hover:opacity-90 transition-opacity disabled:opacity-50">
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </>
              ) : (
                /* ── View mode ── */
                <>
                  {/* Amount + image side by side */}
                  <div className="flex gap-3">
                    <div className="flex-1 py-4 rounded-2xl bg-gray-50 flex flex-col items-center justify-center">
                      <p className="text-2xl font-bold text-gray-900">
                        {receipt.currency === "CAD" ? "CA" : ""}${Number(receipt.amount).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{receipt.currency}</p>
                    </div>
                    {receipt.image_url && (
                      <button
                        onClick={() => setImageFullscreen(true)}
                        className="w-24 rounded-2xl overflow-hidden border border-gray-100 active:opacity-80 flex-shrink-0">
                        <img src={receipt.image_url} alt="Receipt" className="w-full h-full object-cover" />
                      </button>
                    )}
                  </div>

                  {/* 2x2 details grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { label: "Date", value: new Date(receipt.transaction_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) },
                      { label: "Days old", value: days + " days" },
                      { label: "Category", value: (categoryEmoji[receipt.category] ?? "") + " " + receipt.category },
                      { label: "Source", value: sourceLabel[receipt.source] ?? receipt.source },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-gray-50 rounded-xl p-3">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
                        <p className="text-sm font-semibold text-gray-800">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Notes */}
                  {receipt.notes && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Notes</p>
                      <p className="text-sm text-gray-700">{receipt.notes}</p>
                    </div>
                  )}

                  {/* Missing receipt form status */}
                  {receipt.source === "bank_transaction" && (
                    <div className={"rounded-xl p-3 " + (receipt.missing_receipt_form?.completed_at ? "bg-green-50 border border-green-200" : "bg-yellow-50 border border-yellow-200")}>
                      <p className="text-xs font-bold"
                        style={{ color: receipt.missing_receipt_form?.completed_at ? "#16a34a" : "#b45309" }}>
                        {receipt.missing_receipt_form?.completed_at ? "\u2713 Missing Receipt Form Complete" : "\u26A0\uFE0F Missing Receipt Form Needed"}
                      </p>
                      {receipt.missing_receipt_form?.business_purpose && (
                        <p className="text-[11px] text-gray-600 mt-1">{receipt.missing_receipt_form.business_purpose}</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen image overlay */}
      {imageFullscreen && receipt.image_url && (
        <div
          className="fixed inset-0 z-[60] bg-black flex items-center justify-center"
          onClick={() => setImageFullscreen(false)}>
          <button
            onClick={() => setImageFullscreen(false)}
            className="absolute top-12 right-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <img
            src={receipt.image_url}
            alt="Receipt fullscreen"
            className="max-w-full max-h-full object-contain p-4"
          />
        </div>
      )}
    </>
  );
}
