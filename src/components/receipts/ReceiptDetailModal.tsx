"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { daysOld } from "@/types";
import type { Receipt, ReceiptCategory } from "@/types";

const CATEGORIES: { value: ReceiptCategory; label: string; emoji: string }[] = [
  { value: "meals",   label: "Meals",   emoji: "🍽️" },
  { value: "lodging", label: "Lodging", emoji: "🏨" },
  { value: "transit", label: "Transit", emoji: "🚗" },
  { value: "other",   label: "Other",   emoji: "📄" },
];
const categoryEmoji: Record<string, string> = {
  meals: "🍽️", lodging: "🏨", transit: "🚗", other: "📄",
};
const sourceLabel: Record<string, string> = {
  photo: "📷 Photo", bank_transaction: "🏦 Bank", manual: "✍️ Manual",
  email: "📧 Email", concur: "↗️ Concur",
};

interface Draft {
  vendor_name: string; transaction_date: string;
  amount: string; currency: string;
  category: ReceiptCategory; notes: string;
}

export default function ReceiptDetailModal({
  receipt, onClose, onUpdated, initialEditing = false,
}: {
  receipt: Receipt;
  onClose: () => void;
  onUpdated?: (updated: Partial<Receipt>) => void;
  initialEditing?: boolean;
}) {
  const router = useRouter();
  const days   = daysOld(receipt.transaction_date);
  const [imageFullscreen, setImageFullscreen] = useState(false);
  const [isEditing, setIsEditing] = useState(initialEditing);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({
    vendor_name:      receipt.vendor_name,
    transaction_date: receipt.transaction_date,
    amount:           String(receipt.amount),
    currency:         receipt.currency ?? "USD",
    category:         receipt.category,
    notes:            receipt.notes ?? "",
  });

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const inp = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-brand-cyan transition-colors";

  function cancelEdit() {
    setIsEditing(false);
    setDraft({
      vendor_name:      receipt.vendor_name,
      transaction_date: receipt.transaction_date,
      amount:           String(receipt.amount),
      currency:         receipt.currency ?? "USD",
      category:         receipt.category,
      notes:            receipt.notes ?? "",
    });
    setError(null);
  }

  async function saveEdit() {
    setSaving(true); setError(null);
    try {
      const body = { ...draft, amount: parseFloat(draft.amount) };
      const res = await fetch(`/api/receipts/${receipt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      onUpdated?.(body);
      setIsEditing(false);
      router.refresh();
    } catch (e: any) {
      setError(e.message ?? "Save failed");
    } finally { setSaving(false); }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={isEditing ? undefined : onClose} />

        <div className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl flex flex-col overflow-hidden">

          {/* ── Header ── */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xl flex-shrink-0">
                {categoryEmoji[isEditing ? draft.category : receipt.category] ?? "📄"}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">
                  {isEditing ? (draft.vendor_name || "Edit Receipt") : receipt.vendor_name}
                </p>
                <p className="text-[11px] text-gray-400">
                  {isEditing ? "Editing" : `${receipt.category} · ${receipt.source.replace(/_/g, " ")}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {!isEditing && (
                <button onClick={() => { setIsEditing(true); setError(null); }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-xs font-semibold text-gray-600">
                  <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                    <path d="M9.5 1.5l3 3L4 13H1v-3L9.5 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                  </svg>
                  Edit
                </button>
              )}
              {!isEditing && (
                <button onClick={onClose}
                  className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2 2l8 8M10 2L2 10" stroke="#374151" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* ── VIEW MODE — compact, no scroll ── */}
          {!isEditing && (
            <div className="px-5 py-4 space-y-4">

              {/* Amount + image side by side */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-3xl font-bold text-gray-900 leading-none">
                    {receipt.currency === "CAD" ? "CA" : ""}${Number(receipt.amount).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{receipt.currency ?? "USD"}</p>
                </div>
                {receipt.image_url ? (
                  <button onClick={() => setImageFullscreen(true)}
                    className="flex-shrink-0 w-24 h-24 rounded-2xl overflow-hidden border border-gray-100 active:opacity-80">
                    <img src={receipt.image_url} alt="Receipt" className="w-full h-full object-cover" />
                  </button>
                ) : (
                  <div className="flex-shrink-0 w-24 h-24 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                    <span className="text-2xl opacity-30">🧾</span>
                  </div>
                )}
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Date", value: new Date(receipt.transaction_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
                  { label: "Age",  value: `${days} day${days !== 1 ? "s" : ""} old` },
                  { label: "Category", value: `${categoryEmoji[receipt.category]} ${receipt.category}` },
                  { label: "Source",   value: sourceLabel[receipt.source] ?? receipt.source },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-xl px-3 py-2">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              {/* Notes */}
              {receipt.notes && (
                <div className="bg-gray-50 rounded-xl px-3 py-2">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Notes</p>
                  <p className="text-sm text-gray-700 mt-0.5">{receipt.notes}</p>
                </div>
              )}

              {/* Missing form status */}
              {receipt.source === "bank_transaction" && (
                <div className={`rounded-xl px-3 py-2 ${receipt.missing_receipt_form?.completed_at ? "bg-green-50 border border-green-200" : "bg-yellow-50 border border-yellow-200"}`}>
                  <p className="text-xs font-semibold"
                    style={{ color: receipt.missing_receipt_form?.completed_at ? "#16a34a" : "#b45309" }}>
                    {receipt.missing_receipt_form?.completed_at ? "✓ Form Complete" : "⚠️ Form Needed"}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── EDIT MODE — scrollable form ── */}
          {isEditing && (
            <div className="overflow-y-auto max-h-[65svh] px-5 py-4 space-y-4">
              {receipt.image_url && (
                <div className="w-full rounded-2xl overflow-hidden border border-gray-100 max-h-32">
                  <img src={receipt.image_url} alt="Receipt" className="w-full object-cover max-h-32" />
                </div>
              )}
              <div>
                <label className="label">Vendor / Merchant</label>
                <input className={inp} value={draft.vendor_name} autoFocus
                  onChange={e => setDraft(d => ({ ...d, vendor_name: e.target.value }))}
                  placeholder="e.g. Delta, Marriott…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Date</label>
                  <input type="date" className={inp} value={draft.transaction_date}
                    onChange={e => setDraft(d => ({ ...d, transaction_date: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input className={`${inp} pl-6`} type="number" min="0" step="0.01"
                      value={draft.amount}
                      onChange={e => setDraft(d => ({ ...d, amount: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div>
                <label className="label">Currency</label>
                <div className="flex gap-2">
                  {["USD", "CAD"].map(c => (
                    <button key={c} onClick={() => setDraft(d => ({ ...d, currency: c }))}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all
                        ${draft.currency === c ? "bg-brand-navy text-white border-brand-navy" : "bg-white text-gray-600 border-gray-200"}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Category</label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map(cat => (
                    <button key={cat.value} onClick={() => setDraft(d => ({ ...d, category: cat.value }))}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all
                        ${draft.category === cat.value ? "bg-brand-navy text-white border-brand-navy" : "bg-white text-gray-700 border-gray-200"}`}>
                      <span>{cat.emoji}</span><span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea className={`${inp} resize-none`} rows={2} value={draft.notes}
                  onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
                  placeholder="Any extra context…" />
              </div>
              {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
            </div>
          )}

          {/* ── Edit action bar ── */}
          {isEditing && (
            <div className="border-t border-gray-100 px-5 py-4 flex gap-3 bg-white">
              <button onClick={cancelEdit}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={saveEdit}
                disabled={saving || !draft.vendor_name || !draft.amount}
                className={`flex-1 btn-primary ${(saving || !draft.vendor_name || !draft.amount) ? "opacity-50" : ""}`}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen image */}
      {imageFullscreen && receipt.image_url && (
        <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center"
          onClick={() => setImageFullscreen(false)}>
          <button onClick={() => setImageFullscreen(false)}
            className="absolute top-12 right-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <img src={receipt.image_url} alt="Receipt fullscreen" className="max-w-full max-h-full object-contain p-4" />
        </div>
      )}
    </>
  );
}
