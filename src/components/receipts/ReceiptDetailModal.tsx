"use client";

import { useState } from "react";
import { daysOld } from "@/types";
import type { Receipt } from "@/types";

export default function ReceiptDetailModal({ receipt, onClose }: {
  receipt: Receipt;
  onClose: () => void;
}) {
  const days = daysOld(receipt.transaction_date);
  const [imageFullscreen, setImageFullscreen] = useState(false);

  const categoryEmoji: Record<string, string> = {
    meals: "🍽️", lodging: "🏨", transit: "🚗", other: "📄",
  };
  const sourceLabel: Record<string, string> = {
    photo: "📷 Photo", bank_transaction: "🏦 Bank Transaction",
    manual: "✍️ Manual Entry", email: "📧 Email", concur: "↗️ Concur",
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white w-full max-w-md rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">

          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{categoryEmoji[receipt.category] ?? "📄"}</span>
              <div>
                <p className="text-sm font-bold text-gray-900">{receipt.vendor_name}</p>
                <p className="text-[11px] text-gray-400">{receipt.category} · {receipt.source.replace(/_/g, " ")}</p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 2l8 8M10 2L2 10" stroke="#374151" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          <div className="px-5 py-5 space-y-5">
            {/* Amount hero */}
            <div className="text-center py-4 rounded-2xl bg-gray-50">
              <p className="text-3xl font-bold text-gray-900">
                {receipt.currency === "CAD" ? "CA" : ""}${Number(receipt.amount).toFixed(2)}
              </p>
              <p className="text-xs text-gray-400 mt-1">{receipt.currency}</p>
            </div>

            {/* Receipt image — tap to fullscreen */}
            {receipt.image_url && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Receipt Image</p>
                <button
                  onClick={() => setImageFullscreen(true)}
                  className="w-full rounded-2xl overflow-hidden border border-gray-100 active:opacity-80 transition-opacity">
                  <img
                    src={receipt.image_url}
                    alt="Receipt"
                    className="w-full object-contain max-h-64"
                  />
                  <p className="text-[10px] text-gray-400 py-1.5 bg-gray-50">Tap to enlarge</p>
                </button>
              </div>
            )}

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Date", value: new Date(receipt.transaction_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) },
                { label: "Days old", value: `${days} days` },
                { label: "Category", value: `${categoryEmoji[receipt.category]} ${receipt.category}` },
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
              <div className={`rounded-xl p-3 ${receipt.missing_receipt_form?.completed_at ? "bg-green-50 border border-green-200" : "bg-yellow-50 border border-yellow-200"}`}>
                <p className="text-xs font-bold mb-0.5"
                  style={{ color: receipt.missing_receipt_form?.completed_at ? "#16a34a" : "#b45309" }}>
                  {receipt.missing_receipt_form?.completed_at ? "✓ Missing Receipt Form Complete" : "⚠️ Missing Receipt Form Needed"}
                </p>
                {receipt.missing_receipt_form?.business_purpose && (
                  <p className="text-[11px] text-gray-600 mt-1">{receipt.missing_receipt_form.business_purpose}</p>
                )}
              </div>
            )}

            <p className="text-[10px] text-gray-300 text-center">
              Added {new Date(receipt.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
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
