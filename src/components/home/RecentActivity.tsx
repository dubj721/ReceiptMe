"use client";

import { useState } from "react";
import { daysOld, isPolicyApplicable } from "@/types";
import type { Receipt } from "@/types";
import ReceiptDetailModal from "@/components/receipts/ReceiptDetailModal";

const categoryEmoji: Record<string, string> = {
  meals: "🍽️", lodging: "🏨", transit: "🚗", other: "📄",
};

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M3 4h10M5 4V3h6v1M6 7v4M10 7v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <rect x="3.5" y="4" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M11 2l3 3L5 14H2v-3L11 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  );
}

export default function RecentActivity({ receipts, country }: {
  receipts: Receipt[];
  country: string;
}) {
  const [detail,      setDetail]      = useState<Receipt | null>(null);
  const [editMode,    setEditMode]    = useState(false);
  const [confirming,  setConfirming]  = useState<string | null>(null);
  const [local,       setLocal]       = useState(receipts);

  function openView(r: Receipt) {
    setEditMode(false);
    setDetail(r);
  }

  function openEdit(r: Receipt) {
    setEditMode(true);
    setDetail(r);
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/receipts/${id}`, { method: "DELETE" });
    if (res.ok) {
      setLocal(prev => prev.filter(r => r.id !== id));
      setConfirming(null);
      if (detail?.id === id) setDetail(null);
    }
  }

  return (
    <>
      <div className="space-y-2">
        {local.map(r => {
          const days = daysOld(r.transaction_date);
          const warn = isPolicyApplicable(country as "US" | "CA") && days >= 55;

          return (
            <div key={r.id}>
              {/* Delete confirmation */}
              {confirming === r.id && (
                <div className="mb-1 px-4 py-2.5 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-red-700">Delete this receipt?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirming(null)}
                      className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="px-3 py-1.5 rounded-lg bg-red-500 text-xs font-semibold text-white hover:bg-red-600">
                      Delete
                    </button>
                  </div>
                </div>
              )}

              {/* Receipt row */}
              <div className={`group card flex items-center gap-3 transition-all
                ${warn ? "border-yellow-200 bg-yellow-50/30" : "hover:border-brand-cyan/40"}`}>

                {/* Tap to view */}
                <button
                  onClick={() => openView(r)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left">
                  <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 text-lg">
                    {categoryEmoji[r.category] ?? "📄"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{r.vendor_name}</p>
                    <p className="text-[11px] text-gray-400">
                      {new Date(r.transaction_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {" · "}{r.category}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-gray-900 flex-shrink-0 mr-2">
                    ${Number(r.amount).toFixed(2)}
                  </p>
                </button>

                {/* Edit button — matches Packets desktop hover behaviour */}
                <button
                  onClick={e => { e.stopPropagation(); openEdit(r); }}
                  className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-gray-300
                    hover:bg-brand-cyan/10 hover:text-brand-cyan transition-all
                    md:opacity-0 md:group-hover:opacity-100">
                  <PencilIcon />
                </button>

                {/* Delete button */}
                <button
                  onClick={() => setConfirming(confirming === r.id ? null : r.id)}
                  className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-gray-300
                    hover:bg-red-50 hover:text-red-400 transition-all
                    md:opacity-0 md:group-hover:opacity-100">
                  <TrashIcon />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {detail && (
        <ReceiptDetailModal
          receipt={detail}
          onClose={() => { setDetail(null); setEditMode(false); }}
          initialEditing={editMode}
          onUpdated={updated => {
            setLocal(prev => prev.map(r => r.id === detail.id ? { ...r, ...updated } as Receipt : r));
            setDetail(prev => prev ? { ...prev, ...updated } as Receipt : null);
          }}
        />
      )}
    </>
  );
}
