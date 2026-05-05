"use client";

import { useState, useEffect } from "react";
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

/* Field must live OUTSIDE the modal component — prevents React from treating it
   as a new component type on each render, which would unmount inputs and kill focus */
function Field({ label, children, last = false }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={`px-4 py-2.5 ${!last ? "border-b border-gray-100" : ""}`}>
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

  // Lock background scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

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
      {/* Overlay — inset from app header and bottom nav, background scroll blocked */}
      <div className="fixed inset-0 z-50 flex items-center justify-center px-6
                      pt-[92px] pb-[88px] md:pt-6 md:pb-6">
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
          onTouchMove={e => e.preventDefault()}
        />

        {/* Card — fills constrained overlay, never bleeds under nav */}
        <div
          className="relative w-full flex flex-col overflow-hidden shadow-2xl"
          style={{
            maxWidth: 340,
            maxHeight: "100%",
            background: "#f1f7fe",
            borderRadius: 16,
          }}>

          {/* ── Header — compact ── */}
          <div className="flex-shrink-0 px-4 py-2.5 flex items-center justify-between border-b border-blue-100">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base leading-none">{categoryEmoji[localReceipt.category] ?? "📄"}</span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate leading-tight">
                  {isEditing ? "Edit Receipt" : localReceipt.vendor_name}
                </p>
                {!isEditing && (
                  <p className="text-[10px] text-gray-400 leading-tight">
                    {localReceipt.category} · {localReceipt.source.replace(/_/g, " ")}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-6 h-6 rounded-full bg-white/70 flex items-center justify-center hover:bg-white transition-colors flex-shrink-0 ml-2">
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <path d="M2 2l8 8M10 2L2 10" stroke="#374151" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* ── Scrollable body ── */}
          <div
            className="flex-1 overflow-y-auto min-h-0 px-4 pb-4 space-y-3"
            style={{ WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" } as React.CSSProperties}>

            {isEditing ? (
              /* Edit mode — inputs in white stacked-card containers */
              <>
                {/* Vendor */}
                <div className="bg-white rounded-lg overflow-hidden">
                  <Field label="Vendor / Merchant" last>
                    <input
                      className="w-full bg-transparent text-sm font-semibold text-gray-800 outline-none pb-0.5"
                      value={draft.vendor_name}
                      onChange={e => setDraft(d => ({ ...d, vendor_name: e.target.value }))}
                    />
                  </Field>
                </div>

                {/* Amount + Currency */}
                <div className="bg-white rounded-lg overflow-hidden">
                  <Field label="Amount">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      className="w-full bg-transparent text-sm font-semibold text-gray-800 outline-none pb-0.5"
                      value={draft.amount}
                      onChange={e => setDraft(d => ({ ...d, amount: e.target.value }))}
                    />
                  </Field>
                  <Field label="Currency" last>
                    <select
                      className="w-full bg-transparent text-sm font-semibold text-gray-800 outline-none pb-0.5"
                      value={draft.currency}
                      onChange={e => setDraft(d => ({ ...d, currency: e.target.value }))}>
                      {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </Field>
                </div>

                {/* Date + Category */}
                <div className="bg-white rounded-lg overflow-hidden">
                  <Field label="Date">
                    <input
                      type="date"
                      className="w-full bg-transparent text-sm font-semibold text-gray-800 outline-none pb-0.5"
                      value={draft.transaction_date}
                      onChange={e => setDraft(d => ({ ...d, transaction_date: e.target.value }))}
                    />
                  </Field>
                  <Field label="Category" last>
                    <select
                      className="w-full bg-transparent text-sm font-semibold text-gray-800 outline-none pb-0.5"
                      value={draft.category}
                      onChange={e => setDraft(d => ({ ...d, category: e.target.value as ReceiptCategory }))}>
                      {CATEGORIES.map(c => (
                        <option key={c} value={c}>{categoryEmoji[c]} {c}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                {/* Notes */}
                <div className="bg-white rounded-lg overflow-hidden">
                  <Field label="Notes" last>
                    <textarea
                      rows={2}
                      className="w-full bg-transparent text-sm text-gray-800 outline-none resize-none"
                      value={draft.notes}
                      onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
                    />
                  </Field>
                </div>

                {saveError && (
                  <p className="text-xs text-red-500 text-center px-2">{saveError}</p>
                )}
              </>
            ) : (
              /* View mode */
              <>
                {/* Amount + Image */}
                <div className="flex gap-3">
                  <div className="flex-1 py-5 rounded-xl bg-white flex flex-col items-center justify-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {localReceipt.currency === "CAD" ? "CA" : ""}${Number(localReceipt.amount).toFixed(2)}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{localReceipt.currency}</p>
                  </div>
                  {localReceipt.image_url && (
                    <button
                      onClick={() => setImageFullscreen(true)}
                      className="w-24 rounded-xl overflow-hidden border border-white active:opacity-80 flex-shrink-0">
                      <img src={localReceipt.image_url} alt="Receipt" className="w-full h-full object-cover" />
                    </button>
                  )}
                </div>

                {/* Info grid */}
                <div className="bg-white rounded-lg overflow-hidden">
                  {[
                    { label: "Date",     value: new Date(localReceipt.transaction_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) },
                    { label: "Days old", value: days + " days" },
                    { label: "Category", value: (categoryEmoji[localReceipt.category] ?? "") + " " + localReceipt.category },
                    { label: "Source",   value: sourceLabel[localReceipt.source] ?? localReceipt.source },
                  ].map(({ label, value }, i, arr) => (
                    <Field key={label} label={label} last={i === arr.length - 1}>
                      <p className="text-sm font-semibold text-gray-800">{value}</p>
                    </Field>
                  ))}
                </div>

                {/* Notes */}
                {localReceipt.notes && (
                  <div className="bg-white rounded-lg overflow-hidden">
                    <Field label="Notes" last>
                      <p className="text-sm text-gray-700">{localReceipt.notes}</p>
                    </Field>
                  </div>
                )}

                {/* Missing receipt form status */}
                {localReceipt.source === "bank_transaction" && (
                  <div className={"rounded-lg p-3 " + (localReceipt.missing_receipt_form?.completed_at
                    ? "bg-green-50 border border-green-200"
                    : "bg-yellow-50 border border-yellow-200")}>
                    <p className="text-xs font-bold"
                      style={{ color: localReceipt.missing_receipt_form?.completed_at ? "#16a34a" : "#b45309" }}>
                      {localReceipt.missing_receipt_form?.completed_at
                        ? "✓ Missing Receipt Form Complete"
                        : "⚠️ Missing Receipt Form Needed"}
                    </p>
                    {localReceipt.missing_receipt_form?.business_purpose && (
                      <p className="text-[11px] text-gray-600 mt-1">{localReceipt.missing_receipt_form.business_purpose}</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Footer — matches uiverse .form-section style ── */}
          <div
            className="flex-shrink-0 px-4 py-4 flex gap-3"
            style={{ background: "#e0ecfb" }}>
            {isEditing ? (
              <>
                <button
                  onClick={() => { setIsEditing(false); setSaveError(null); }}
                  className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-white/70 hover:bg-white transition-colors"
                  style={{ borderRadius: 24 }}>
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="flex-1 py-2.5 text-sm font-bold text-white disabled:opacity-50 transition-opacity"
                  style={{ borderRadius: 24, background: "#00283C" }}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
                style={{ borderRadius: 24, background: "#00283C" }}>
                Edit Receipt
              </button>
            )}
          </div>
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
