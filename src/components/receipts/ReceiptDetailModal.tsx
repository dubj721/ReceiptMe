"use client";

import { useState } from "react";
import { daysOld } from "@/types";
import type { Receipt, ReceiptCategory } from "@/types";
import { trackEvent } from "@/lib/track";

const CATEGORIES: ReceiptCategory[] = ["meals", "lodging", "transit", "other"];
const CURRENCIES = ["USD", "CAD"];

const categoryEmoji: Record<string, string> = {
  meals: "🍽️", lodging: "🏨", transit: "🚗", other: "📄",
};
const sourceLabel: Record<string, string> = {
  photo: "📷 Photo", bank_transaction: "🏦 Bank Transaction",
  manual: "✍️ Manual Entry", email: "📧 Email", concur: "↗️ Concur",
};

/* Field must live OUTSIDE the modal component so React does not treat it as a
   new component type on every render — that would unmount inputs and kill focus */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      {children}
    </div>
  );
}

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
  const [imageFullscreen, setImageFullscreen] = useState(false);
  const [isEditing, setIsEditing]             = useState(initialEditing);
  const [saving, setSaving]                   = useState(false);
  const [saveError, setSaveError]             = useState<string | null>(null);

  const [localReceipt, setLocalReceipt] = useState<Receipt>(receipt);

  const [draft, setDraft] = useState({
    vendor_name:      receipt.vendor_name,
    transaction_date: receipt.transaction_date,
    amount:           String(receipt.amount),
    currency:         receipt.currency,
    category:         receipt.category as ReceiptCategory,
    notes:            receipt.notes ?? "",
  });

  const days = daysOld(localReceipt.transaction_date);

  async function saveEdit() {
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        vendor_name:      draft.vendor_name,
        transaction_date: draft.transaction_date,
        amount:           parseFloat(draft.amount),
        currency:         draft.currency,
        category:         draft.category,
        notes:            draft.notes,
      };
      const res = await fetch("/api/receipts/" + receipt.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());

      const updated = { ...localReceipt, ...payload };
      setLocalReceipt(updated);
      setIsEditing(false);

      trackEvent("receipt_edited", { receipt_id: receipt.id });
      onUpdated?.(payload);
    } catch (e: any) {
      setSaveError(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

        {/* Modal — fixed size, flex column, never grows */}
        <div
          className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          style={{ height: "min(560px, 88svh)" }}>

          {/* ── Header (fixed) ─────────────────────────── */}
          <div className="flex-shrink-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">{categoryEmoji[localReceipt.category] ?? "📄"}</span>
              <div>
                <p className="text-sm font-bold text-gray-900 leading-tight">
                  {isEditing ? "Edit Receipt" : localReceipt.vendor_name}
                </p>
                {!isEditing && (
                  <p className="text-[11px] text-gray-400">
                    {localReceipt.category} · {localReceipt.source.replace(/_/g, " ")}
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

          {/* ── Scrollable body (fills remaining space) ── */}
          <div className="flex-1 overflow-y-auto min-h-0 px-5 py-4 space-y-3"
            style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}>

            {isEditing ? (
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
                    rows={3}
                    className="w-full bg-transparent text-sm text-gray-800 outline-none border-b border-gray-300 focus:border-brand-cyan pb-0.5 resize-none"
                    value={draft.notes}
                    onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
                  />
                </Field>

                {saveError && (
                  <p className="text-xs text-red-500 text-center">{saveError}</p>
                )}
              </>
            ) : (
              <>
                <div className="flex gap-3">
                  <div className="flex-1 py-4 rounded-2xl bg-gray-50 flex flex-col items-center justify-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {localReceipt.currency === "CAD" ? "CA" : ""}${Number(localReceipt.amount).toFixed(2)}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{localReceipt.currency}</p>
                  </div>
                  {localReceipt.image_url && (
                    <button
                      onClick={() => setImageFullscreen(true)}
                      className="w-24 rounded-2xl overflow-hidden border border-gray-100 active:opacity-80 flex-shrink-0">
                      <img src={localReceipt.image_url} alt="Receipt" className="w-full h-full object-cover" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { label: "Date",     value: new Date(localReceipt.transaction_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) },
                    { label: "Days old", value: days + " days" },
                    { label: "Category", value: (categoryEmoji[localReceipt.category] ?? "") + " " + localReceipt.category },
                    { label: "Source",   value: sourceLabel[localReceipt.source] ?? localReceipt.source },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
                      <p className="text-sm font-semibold text-gray-800">{value}</p>
                    </div>
                  ))}
                </div>

                {localReceipt.notes && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Notes</p>
                    <p className="text-sm text-gray-700">{localReceipt.notes}</p>
                  </div>
                )}

                {localReceipt.source === "bank_transaction" && (
                  <div className={"rounded-xl p-3 " + (localReceipt.missing_receipt_form?.completed_at ? "bg-green-50 border border-green-200" : "bg-yellow-50 border border-yellow-200")}>
                    <p className="text-xs font-bold"
                      style={{ color: localReceipt.missing_receipt_form?.completed_at ? "#16a34a" : "#b45309" }}>
                      {localReceipt.missing_receipt_form?.completed_at ? "✓ Missing Receipt Form Complete" : "⚠️ Missing Receipt Form Needed"}
                    </p>
                    {localReceipt.missing_receipt_form?.business_purpose && (
                      <p className="text-[11px] text-gray-600 mt-1">{localReceipt.missing_receipt_form.business_purpose}</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Footer — only shown in edit mode, always visible ── */}
          {isEditing && (
            <div className="flex-shrink-0 border-t border-gray-100 px-5 py-3 flex gap-3 bg-white">
              <button
                onClick={() => { setIsEditing(false); setSaveError(null); }}
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
          )}
        </div>
      </div>

      {/* Fullscreen image */}
      {imageFullscreen && localReceipt.image_url && (
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
          <img src={localReceipt.image_url} alt="Receipt fullscreen" className="max-w-full max-h-full object-contain p-4" />
        </div>
      )}
    </>
  );
}
