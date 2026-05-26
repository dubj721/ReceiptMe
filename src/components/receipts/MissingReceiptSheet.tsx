"use client";

import { useState, useEffect } from "react";
import type { Receipt } from "@/types";
import ClearableInput from "@/components/ui/ClearableInput";

interface Props {
  receipt: Receipt;
  open:    boolean;
  onClose: () => void;
  onSaved?: () => void;
}

interface FormState {
  business_purpose: string;
  reason:           string;
  signature:        string;
}

/**
 * Slide-up sheet for viewing / filling / editing the Missing Receipt Form.
 * Used from the Packets page when the user taps the paper icon on a bank-transaction receipt.
 */
export default function MissingReceiptSheet({ receipt, open, onClose, onSaved }: Props) {
  const [form,    setForm]    = useState<FormState>({ business_purpose: "", reason: "", signature: "" });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const existing = receipt.missing_receipt_form;
  const completed = !!existing?.completed_at;

  // Pre-populate from existing form data
  useEffect(() => {
    if (existing) {
      setForm({
        business_purpose: existing.business_purpose ?? "",
        reason:           existing.reason           ?? "",
        // Strip "sig:" prefix if present
        signature:        existing.signature_url?.startsWith("sig:")
          ? existing.signature_url.slice(4)
          : "",
      });
    }
  }, [existing, open]);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const resp = await fetch(`/api/missing-forms/${receipt.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          completed_at: new Date().toISOString(),
        }),
      });
      if (!resp.ok) throw new Error(await resp.text());
      setSuccess(true);
      onSaved?.();
    } catch (e: any) {
      setError(e.message ?? "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  const inp = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-brand-cyan transition-colors";

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 pt-[60px] md:pt-0 transition-opacity duration-300
          ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl
                    transition-transform duration-300 ease-out max-h-[85svh] md:max-h-[92vh] overflow-y-auto
          ${open ? "translate-y-0" : "translate-y-full"}`}
      >
        {/* Pull handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="px-4 pb-10 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold text-brand-navy/60 uppercase tracking-widest">
                Insight Global LLC
              </p>
              <h2 className="text-base font-bold text-gray-900 mt-0.5">
                Missing Expense Receipt Form
              </h2>
              {completed && (
                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5
                                 rounded-full bg-green-50 border border-green-200 text-[10px]
                                 font-semibold text-green-700">
                  ✓ Submitted
                </span>
              )}
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center
                         text-gray-400 hover:text-gray-600 flex-shrink-0 mt-1">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Auto-filled receipt info */}
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
              Auto-filled from receipt
            </p>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <p className="text-gray-400 mb-0.5">Vendor</p>
                <p className="font-semibold text-gray-800 truncate">{receipt.vendor_name}</p>
              </div>
              <div>
                <p className="text-gray-400 mb-0.5">Amount</p>
                <p className="font-semibold text-gray-800">
                  ${Number(receipt.amount).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-gray-400 mb-0.5">Date</p>
                <p className="font-semibold text-gray-800">
                  {new Date(receipt.transaction_date).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Business purpose */}
          <div>
            <label className="label">
              Business Purpose for Expense
              {!completed && <span className="text-red-400 ml-0.5">*</span>}
            </label>
            <textarea
              className={`${inp} resize-none`}
              rows={3}
              readOnly={completed && !success}
              placeholder="Describe the business reason for this expense…"
              value={form.business_purpose}
              onChange={e => setForm(f => ({ ...f, business_purpose: e.target.value }))}
            />
          </div>

          {/* Reason */}
          <div>
            <label className="label">
              Reason for Missing Receipt
              {!completed && <span className="text-red-400 ml-0.5">*</span>}
            </label>
            <textarea
              className={`${inp} resize-none`}
              rows={3}
              readOnly={completed && !success}
              placeholder="Explain why the original receipt is unavailable…"
              value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
            />
          </div>

          {/* Signature */}
          <div>
            <label className="label">
              Electronic Signature
              {!completed && <span className="text-red-400 ml-0.5">*</span>}
            </label>
            {completed && !success ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
                <p className="text-sm font-bold italic text-gray-700">{form.signature}</p>
                <p className="text-[10px] text-gray-400 mt-1">
                  Electronically signed ·{" "}
                  {existing?.completed_at
                    ? new Date(existing.completed_at).toLocaleDateString("en-US", {
                        month: "long", day: "numeric", year: "numeric",
                      })
                    : ""}
                </p>
              </div>
            ) : (
              <>
                <ClearableInput
                  inputClassName={`${inp} italic`}
                  placeholder="Type your full name"
                  value={form.signature}
                  onChange={e => setForm(f => ({ ...f, signature: e.target.value }))}
                  onClear={() => setForm(f => ({ ...f, signature: "" }))}
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  By typing your name you agree this serves as your electronic signature.
                </p>
              </>
            )}
          </div>

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

          {success ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-200
                              flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 10l3.5 3.5L15 7" stroke="#16a34a" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-700">Form submitted!</p>
              <button onClick={onClose} className="btn-primary mt-1 px-8">Done</button>
            </div>
          ) : completed ? (
            /* Already submitted — show edit button */
            <button
              onClick={() => setSuccess(false)}
              className="w-full py-3 rounded-xl border border-gray-200 text-sm font-semibold
                         text-gray-600 hover:bg-gray-50 transition-colors">
              Edit & Resubmit
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving || !form.business_purpose || !form.reason || !form.signature}
              className={`w-full btn-primary transition-opacity
                ${(saving || !form.business_purpose || !form.reason || !form.signature)
                  ? "opacity-50" : ""}`}>
              {saving ? "Submitting…" : "Submit Form"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
