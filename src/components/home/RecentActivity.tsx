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
  const [detail,     setDetail]     = useState<Receipt | null>(null);
  const [editMode,   setEditMode]   = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [local,      setLocal]      = useState(receipts);

  function openView(r: Receipt) { setEditMode(false); setDetail(r); }
  function openEdit(r: Receipt) { setEditMode(true);  setDetail(r); }

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
                <div
                  className="mb-1 px-4 py-2.5 rounded-2xl flex items-center justify-between gap-3"
                  style={{
                    background: "#fef2f2",
                    border: "1px solid rgba(239,68,68,0.25)",
                  }}>
                  <p className="text-xs font-semibold text-red-600">Delete this receipt?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirming(null)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600"
                      style={{ background: "#f1f5f9", border: "1px solid #e2e8f0" }}>
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="px-3 py-1.5 rounded-lg bg-red-500 text-xs font-semibold text-white">
                      Delete
                    </button>
                  </div>
                </div>
              )}

              {/* Receipt row */}
              <div
                className="group card flex items-center gap-3 transition-all"
                style={warn ? {
                  background: "#fffbeb",
                  borderColor: "rgba(245,158,11,0.35)",
                  boxShadow: "0 2px 8px rgba(245,158,11,0.1)",
                } : {}}>

                {/* Tap to view */}
                <button
                  onClick={() => openView(r)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                    style={{ background: "#f1f5f9" }}>
                    {categoryEmoji[r.category] ?? "📄"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "#00283C" }}>{r.vendor_name}</p>
                    <p className="text-[11px] text-gray-400">
                      {new Date(r.transaction_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {" · "}{r.category}
                    </p>
                  </div>
                  <p className="text-sm font-bold flex-shrink-0 mr-2" style={{ color: "#00283C" }}>
                    ${Number(r.amount).toFixed(2)}
                  </p>
                </button>

                {/* Edit button */}
                <button
                  onClick={e => { e.stopPropagation(); openEdit(r); }}
                  className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all
                    md:opacity-0 md:group-hover:opacity-100"
                  style={{ color: "#9ca3af" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#00D6F2")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}>
                  <PencilIcon />
                </button>

                {/* Delete button */}
                <button
                  onClick={() => setConfirming(confirming === r.id ? null : r.id)}
                  className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all
                    md:opacity-0 md:group-hover:opacity-100"
                  style={{ color: "#9ca3af" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}>
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
