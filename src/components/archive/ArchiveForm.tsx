"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import type { Receipt } from "@/types";
import { daysOld } from "@/types";
import { EXPENSE_CATEGORIES } from "@/lib/expense-categories";

/* ─── Types ──────────────────────────────────────────────── */
type RowData = {
  expenseType: string;
  description: string;
  customer: string;
  contacts: string;
  groupSize: string;
  parkingTolls: string;
  tip: string;
};

type FormData = {
  header: { name: string; office: string; month: string };
  rows: Record<string, RowData>;
};

function defaultRow(receipt: Receipt): RowData {
  return {
    expenseType: "",
    description: receipt.vendor_name ?? "",
    customer: "",
    contacts: "",
    groupSize: "",
    parkingTolls: "",
    tip: "",
  };
}

function storageKey(userId: string) {
  return `overdue_form_${userId}`;
}

/* ─── Signature storage helpers ─────────────────────────── */
function sigKey(userId: string)   { return `ig_signature_${userId}`; }
function batchKey(userId: string) { return `ig_signed_batches_${userId}`; }

function batchHash(receipts: Receipt[]): string {
  return receipts.map(r => r.id).sort().join(",");
}

function getSavedSignature(userId: string): string {
  try { return localStorage.getItem(sigKey(userId)) ?? ""; } catch { return ""; }
}

function isBatchSigned(userId: string, receipts: Receipt[]): boolean {
  try {
    const stored = localStorage.getItem(batchKey(userId));
    if (!stored) return false;
    const batches: Record<string, string> = JSON.parse(stored);
    return !!batches[batchHash(receipts)];
  } catch { return false; }
}

function signBatch(userId: string, receipts: Receipt[], signature: string) {
  try {
    localStorage.setItem(sigKey(userId), signature);
    const stored = localStorage.getItem(batchKey(userId));
    const batches: Record<string, string> = stored ? JSON.parse(stored) : {};
    batches[batchHash(receipts)] = signature;
    localStorage.setItem(batchKey(userId), JSON.stringify(batches));
  } catch { /* ignore */ }
}

function getBatchSignature(userId: string, receipts: Receipt[]): string {
  try {
    const stored = localStorage.getItem(batchKey(userId));
    if (!stored) return "";
    const batches: Record<string, string> = JSON.parse(stored);
    return batches[batchHash(receipts)] ?? "";
  } catch { return ""; }
}

/* ─── Signature modal ────────────────────────────────────── */
function SignatureModal({
  defaultSig,
  onSign,
  onCancel,
}: {
  defaultSig: string;
  onSign: (sig: string) => void;
  onCancel: () => void;
}) {
  const [sig, setSig] = useState(defaultSig);

  // Prevent background scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div
        className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: "#00283C", border: "1px solid rgba(0,214,242,0.3)", boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}>

        <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: "#00D6F2" }}>
          Electronic Signature
        </p>
        <p className="text-base font-bold text-white mb-1">Sign Expense Report</p>
        <p className="text-xs mb-5" style={{ color: "rgba(255,255,255,0.5)" }}>
          By typing your full name, you certify that all expenses are accurate and comply with Insight Global policy.
        </p>

        <label className="block text-[11px] font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.6)" }}>
          Full Name <span style={{ color: "#ef4444" }}>*</span>
        </label>
        <input
          autoFocus
          type="text"
          placeholder="Type your full name…"
          value={sig}
          onChange={e => setSig(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && sig.trim()) onSign(sig.trim()); }}
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none italic font-medium mb-5"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(0,214,242,0.4)",
            color: "#ffffff",
          }}
        />

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.15)" }}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => { if (sig.trim()) onSign(sig.trim()); }}
            disabled={!sig.trim()}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 transition-opacity"
            style={{ background: "#00D6F2", color: "#00283C" }}>
            Sign &amp; Export
          </button>
        </div>

        <p className="text-[10px] text-center mt-3" style={{ color: "rgba(255,255,255,0.3)" }}>
          Your signature will be saved for future overdue exports
        </p>
      </div>
    </div>
  );
}

function deriveMonth(receipts: Receipt[]): string {
  if (!receipts.length) return "";
  const dates = receipts.map(r => r.transaction_date).sort();
  const d = new Date(dates[0]);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/* ─── Category picker ────────────────────────────────────── */
function CategoryPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const filtered = EXPENSE_CATEGORIES.filter(c =>
    c.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-left transition-colors"
        style={{
          background: "#f8fafc",
          border: value ? "1px solid #00D6F2" : "1px solid #e2e8f0",
          color: value ? "#00283C" : "#9ca3af",
        }}>
        <span className="truncate flex-1 mr-2">
          {value || "Select expense type…"}
        </span>
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          className="flex-shrink-0 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
          <path d="M2 4l4 4 4-4" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div
          className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden"
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            top: "100%",
          }}>
          {/* Search */}
          <div className="p-2 border-b" style={{ borderColor: "#f1f5f9" }}>
            <input
              autoFocus
              type="text"
              placeholder="Search categories…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg outline-none"
              style={{ background: "#f8fafc", border: "1px solid #e2e8f0", color: "#111827" }}
            />
          </div>
          {/* Options */}
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-xs text-gray-400 text-center">No match</p>
            ) : (
              filtered.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => { onChange(cat); setOpen(false); setQuery(""); }}
                  className="w-full text-left px-4 py-2.5 text-xs transition-colors"
                  style={{
                    background: cat === value ? "rgba(0,214,242,0.08)" : "transparent",
                    color: cat === value ? "#00283C" : "#374151",
                    fontWeight: cat === value ? 600 : 400,
                  }}
                  onMouseEnter={e => {
                    if (cat !== value) (e.currentTarget as HTMLElement).style.background = "#f8fafc";
                  }}
                  onMouseLeave={e => {
                    if (cat !== value) (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}>
                  {cat}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Single receipt card ────────────────────────────────── */
const categoryEmoji: Record<string, string> = {
  meals: "🍽️", lodging: "🏨", transit: "🚗", other: "📄",
};

function ReceiptFormCard({
  receipt,
  row,
  collapsed,
  onChange,
  onToggle,
  onSave,
  onDelete,
}: {
  receipt: Receipt;
  row: RowData;
  collapsed: boolean;
  onChange: (field: keyof RowData, value: string) => void;
  onToggle: () => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const [saveFlash,   setSaveFlash]   = useState(false);
  const [confirming,  setConfirming]  = useState(false);
  const isComplete = !!row.expenseType;

  function handleSave() {
    onSave();
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1500);
  }

  return (
    <div
      className="rounded-2xl mb-3 overflow-hidden"
      style={{ border: "1px solid #e2e8f0", background: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>

      {/* ── Clickable header — always visible ── */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-black/[0.02]"
        style={{ background: "#f8fafc", borderBottom: collapsed ? "none" : "1px solid #f1f5f9" }}>

        {/* Emoji */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
          style={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
          {categoryEmoji[receipt.category] ?? "📄"}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: "#00283C" }}>
            {receipt.vendor_name}
          </p>
          {collapsed && row.expenseType ? (
            <p className="text-[11px] font-medium truncate mt-0.5" style={{ color: "#00D6F2" }}>
              {row.expenseType}
            </p>
          ) : (
            <p className="text-[11px] text-gray-400 mt-0.5">
              {new Date(receipt.transaction_date).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric",
              })}
              {" · "}{receipt.source.replace(/_/g, " ")}
            </p>
          )}
        </div>

        {/* Right side: amount + status dot + chevron */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sm font-bold" style={{ color: "#00283C" }}>
            ${Number(receipt.amount).toFixed(2)}
          </span>
          {/* Status dot */}
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: isComplete ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.12)",
              border: `1px solid ${isComplete ? "rgba(34,197,94,0.4)" : "rgba(245,158,11,0.35)"}`,
            }}>
            {isComplete ? (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5l2.5 2.5L8 3" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M5 2.5v3M5 7.5v.2" stroke="#f59e0b" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            )}
          </div>
          {/* Chevron */}
          <svg
            width="14" height="14" viewBox="0 0 14 14" fill="none"
            className="flex-shrink-0 transition-transform duration-200"
            style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}>
            <path d="M3 5l4 4 4-4" stroke="#9ca3af" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>

      {/* ── Expandable form fields ── */}
      {!collapsed && (
        <div className="px-4 py-4 space-y-3">

          {/* Expense Type */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">
              Expense Type <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <CategoryPicker
              value={row.expenseType}
              onChange={v => onChange("expenseType", v)}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Description</label>
            <input
              type="text"
              value={row.description}
              onChange={e => onChange("description", e.target.value)}
              placeholder="Vendor / purpose…"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "#f8fafc", border: "1px solid #e2e8f0", color: "#111827" }}
            />
          </div>

          {/* Customer + Contacts */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Customer</label>
              <input
                type="text"
                value={row.customer}
                onChange={e => onChange("customer", e.target.value)}
                placeholder="Client / company…"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "#f8fafc", border: "1px solid #e2e8f0", color: "#111827" }}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Contacts</label>
              <input
                type="text"
                value={row.contacts}
                onChange={e => onChange("contacts", e.target.value)}
                placeholder="Names attended…"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "#f8fafc", border: "1px solid #e2e8f0", color: "#111827" }}
              />
            </div>
          </div>

          {/* Group Size + Parking + Tip */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Group Size</label>
              <input
                type="number"
                min="1"
                value={row.groupSize}
                onChange={e => onChange("groupSize", e.target.value)}
                placeholder="—"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "#f8fafc", border: "1px solid #e2e8f0", color: "#111827" }}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Parking/Tolls</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={row.parkingTolls}
                onChange={e => onChange("parkingTolls", e.target.value)}
                placeholder="$0.00"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "#f8fafc", border: "1px solid #e2e8f0", color: "#111827" }}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Tip</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={row.tip}
                onChange={e => onChange("tip", e.target.value)}
                placeholder="$0.00"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "#f8fafc", border: "1px solid #e2e8f0", color: "#111827" }}
              />
            </div>
          </div>

          {/* Per-card save button */}
          <button
            type="button"
            onClick={handleSave}
            className="w-full py-2.5 rounded-xl text-sm font-bold transition-all mt-1"
            style={{
              background: saveFlash ? "rgba(34,197,94,0.12)" : "#00D6F2",
              color: saveFlash ? "#16a34a" : "#00283C",
              border: saveFlash ? "1px solid rgba(34,197,94,0.3)" : "1px solid #00D6F2",
            }}>
            {saveFlash ? "✓ Saved" : "Save"}
          </button>

          {/* Delete */}
          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="w-full py-2 text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors">
              Delete receipt
            </button>
          ) : (
            <div
              className="flex items-center justify-between px-3 py-2.5 rounded-xl mt-1"
              style={{ background: "#fef2f2", border: "1px solid rgba(239,68,68,0.2)" }}>
              <p className="text-xs font-semibold text-red-600">Delete this receipt?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600"
                  style={{ background: "#f1f5f9", border: "1px solid #e2e8f0" }}>
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  className="px-3 py-1.5 rounded-lg bg-red-500 text-xs font-semibold text-white">
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── PDF helpers ────────────────────────────────────────── */
function pdfFooter(doc: any, PW: number, PH: number) {
  const page = doc.internal.getCurrentPageInfo().pageNumber;
  doc.setDrawColor(210, 220, 230);
  doc.setLineWidth(0.3);
  doc.line(14, PH - 13, PW - 14, PH - 13);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(160, 174, 192);
  doc.text("Confidential — Insight Global LLC — Internal Use Only", 14, PH - 8.5);
  doc.text(`Page ${page}`, PW - 14, PH - 8.5, { align: "right" });
}

async function fetchImgBase64(url: string): Promise<{ data: string; fmt: string; natW: number; natH: number } | null> {
  try {
    const res  = await fetch(url);
    const blob = await res.blob();
    const data = await new Promise<string>((ok, fail) => {
      const fr = new FileReader();
      fr.onload  = () => ok(fr.result as string);
      fr.onerror = fail;
      fr.readAsDataURL(blob);
    });
    const { w, h } = await new Promise<{ w: number; h: number }>((ok) => {
      const img = new Image();
      img.onload  = () => ok({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => ok({ w: 1, h: 1 });
      img.src = data;
    });
    return { data, fmt: blob.type.includes("png") ? "PNG" : "JPEG", natW: w, natH: h };
  } catch {
    return null;
  }
}

/* ─── Combined PDF export ────────────────────────────────── */
async function exportCombinedPDF(
  receipts: Receipt[],
  rows: Record<string, RowData>,
  header: { name: string; office: string; month: string },
  signature: string,
) {
  const { default: jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const PW  = 215.9;
  const PH  = 279.4;
  const ML  = 10;
  const MR  = 10;
  const CW  = PW - ML - MR;

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" });
  const fmt$    = (v: string | number) =>
    v ? `$${Number(v).toFixed(2)}` : "";

  // ── Column layout ──────────────────────────────────────────
  // Total CW = 195.9mm
  const COLS = [
    { key: "expenseType",  label: "Expense Type",    w: 45 },
    { key: "date",         label: "Date",             w: 18 },
    { key: "groupSize",    label: "Grp",              w: 8  },
    { key: "customer",     label: "Customer",         w: 26 },
    { key: "contacts",     label: "Contacts",         w: 26 },
    { key: "description",  label: "Description",      w: 33 },
    { key: "parkingTolls", label: "Prk/Tolls",        w: 16 },
    { key: "total",        label: "Total",            w: 14 },
    { key: "tip",          label: "Tip",              w: 9.9},
  ];

  // ── Page 1: Paper Form ─────────────────────────────────────

  // Title bar
  doc.setFillColor(0, 40, 60);
  doc.rect(0, 0, PW, 10, "F");
  doc.setFillColor(0, 214, 242);
  doc.rect(0, 0, 4, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text("INSIGHT GLOBAL INC — SALES EXPENSE REPORT", ML + 2, 6.5);

  // Header fields
  let y = 14;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(`Name:  `, ML, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 40, 60);
  doc.text(header.name || "___________________", ML + 14, y);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(`Office:  `, ML, y + 5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 40, 60);
  doc.text(header.office || "___________________", ML + 14, y + 5);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(`Month:  `, ML + 80, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 40, 60);
  doc.text(header.month || "___________________", ML + 96, y);

  // "Overdue or Termed Expenses" label
  y += 13;
  doc.setFont("helvetica", "bolditalic");
  doc.setFontSize(7.5);
  doc.setTextColor(180, 30, 30);
  doc.text("* Overdue or Termed Expenses *", ML, y);

  // Column headers
  y += 4;
  const HDR_H = 8;
  doc.setFillColor(0, 40, 60);
  doc.rect(ML, y, CW, HDR_H, "F");

  let xCursor = ML;
  COLS.forEach((col) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(255, 255, 255);
    const lines = doc.splitTextToSize(col.label, col.w - 2);
    doc.text(lines, xCursor + 1.5, y + 3);
    xCursor += col.w;
  });

  // Data rows
  y += HDR_H;
  const ROW_H = 8;
  let totalAmount   = 0;
  let totalParking  = 0;
  let totalTip      = 0;

  receipts.forEach((receipt, idx) => {
    if (y + ROW_H > PH - 22) {
      pdfFooter(doc, PW, PH);
      doc.addPage();
      y = 10;

      // Repeat column headers on new page
      doc.setFillColor(0, 40, 60);
      doc.rect(ML, y, CW, HDR_H, "F");
      let hx = ML;
      COLS.forEach((col) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(5.5);
        doc.setTextColor(255, 255, 255);
        doc.text(col.label, hx + 1.5, y + 5);
        hx += col.w;
      });
      y += HDR_H;
    }

    const row = rows[receipt.id];
    const rowFill = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
    doc.setFillColor(...(rowFill as [number, number, number]));
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.rect(ML, y, CW, ROW_H, "FD");

    const amount     = Number(receipt.amount);
    const parking    = row?.parkingTolls ? Number(row.parkingTolls) : 0;
    const tip        = row?.tip ? Number(row.tip) : 0;
    totalAmount  += amount;
    totalParking += parking;
    totalTip     += tip;

    const cellValues: Record<string, string> = {
      expenseType:  row?.expenseType  || "",
      date:         fmtDate(receipt.transaction_date),
      groupSize:    row?.groupSize    || "",
      customer:     row?.customer     || "",
      contacts:     row?.contacts     || "",
      description:  row?.description  || receipt.vendor_name,
      parkingTolls: parking ? fmt$(parking) : "",
      total:        fmt$(amount),
      tip:          tip ? fmt$(tip) : "",
    };

    let cx = ML;
    COLS.forEach((col) => {
      const val = cellValues[col.key] || "";
      doc.setFont("helvetica", "normal");
      doc.setFontSize(5.8);
      doc.setTextColor(30, 40, 60);
      const clipped = doc.splitTextToSize(val, col.w - 2)[0] ?? "";
      doc.text(clipped, cx + 1.5, y + 5);
      cx += col.w;
    });

    y += ROW_H;
  });

  // Totals row
  if (y + ROW_H > PH - 22) {
    pdfFooter(doc, PW, PH);
    doc.addPage();
    y = 10;
  }
  doc.setFillColor(0, 40, 60);
  doc.rect(ML, y, CW, ROW_H, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTALS", ML + 2, y + 5);

  let tx = ML;
  COLS.forEach((col) => {
    let val = "";
    if (col.key === "parkingTolls") val = totalParking ? fmt$(totalParking) : "";
    if (col.key === "total")        val = fmt$(totalAmount);
    if (col.key === "tip")          val = totalTip ? fmt$(totalTip) : "";
    if (val) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(0, 214, 242);
      doc.text(val, tx + 1.5, y + 5);
    }
    tx += col.w;
  });
  y += ROW_H + 4;

  // Grand total line
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0, 40, 60);
  doc.text("Expenses Grand Total:", ML, y + 5);
  doc.setTextColor(0, 40, 60);
  doc.text(fmt$(totalAmount + totalParking + totalTip), PW - MR, y + 5, { align: "right" });

  // Signature block
  y += 14;
  if (y + 18 > PH - 22) {
    pdfFooter(doc, PW, PH);
    doc.addPage();
    y = 14;
  }
  doc.setDrawColor(0, 40, 60);
  doc.setLineWidth(0.3);
  doc.line(ML, y + 10, ML + 90, y + 10);
  doc.line(ML + 100, y + 10, ML + 140, y + 10);

  doc.setFont("helvetica", "bolditalic");
  doc.setFontSize(10);
  doc.setTextColor(0, 40, 60);
  doc.text(signature || header.name, ML, y + 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Employee Signature", ML, y + 14);
  doc.text("Date", ML + 100, y + 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(0, 40, 60);
  doc.text(new Date().toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" }), ML + 100, y + 9);

  // ── Part 2: Receipt Images ─────────────────────────────────
  pdfFooter(doc, PW, PH);
  doc.addPage();

  // Section header
  doc.setFillColor(0, 40, 60);
  doc.rect(0, 0, PW, 18, "F");
  doc.setFillColor(239, 68, 68);
  doc.rect(0, 0, 4, 18, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text("Receipt Documentation", ML + 2, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(160, 200, 220);
  doc.text(`${receipts.length} receipt${receipts.length !== 1 ? "s" : ""}  ·  Overdue Expenses  ·  ${header.name}`, PW - MR, 12, { align: "right" });

  // Fetch images
  const imgCache: Record<string, Awaited<ReturnType<typeof fetchImgBase64>>> = {};
  await Promise.all(
    receipts.filter(r => r.image_url).map(async r => {
      imgCache[r.id] = await fetchImgBase64(r.image_url!);
    })
  );

  const COLS_IMG  = 3;
  const COL_GAP   = 5;
  const COL_W_IMG = (CW - COL_GAP * (COLS_IMG - 1)) / COLS_IMG;
  const IMG_H     = 74;
  const INFO_GAP  = 2.5;
  const INFO_H    = 24;
  const CELL_H    = IMG_H + INFO_GAP + INFO_H;
  const ROW_GAP   = 8;

  y = 24;

  const imgRows: Receipt[][] = [];
  for (let i = 0; i < receipts.length; i += COLS_IMG) {
    imgRows.push(receipts.slice(i, i + COLS_IMG));
  }

  imgRows.forEach((row) => {
    if (y + CELL_H > PH - 18) {
      pdfFooter(doc, PW, PH);
      doc.addPage();
      y = 16;
    }

    row.forEach((r, col) => {
      const x        = ML + col * (COL_W_IMG + COL_GAP);
      const img      = imgCache[r.id] ?? null;
      const isBank   = r.source === "bank_transaction";
      const formDone = !!r.missing_receipt_form?.completed_at;

      doc.setFillColor(254, 242, 242);
      doc.setDrawColor(239, 68, 68);
      doc.setLineWidth(0.25);
      doc.rect(x, y, COL_W_IMG, IMG_H, "FD");

      if (img) {
        let iW = COL_W_IMG - 2;
        let iH = (img.natH / img.natW) * iW;
        if (iH > IMG_H - 2) { iH = IMG_H - 2; iW = (img.natW / img.natH) * iH; }
        doc.addImage(img.data, img.fmt, x + (COL_W_IMG - iW) / 2, y + (IMG_H - iH) / 2, iW, iH);
      } else if (isBank) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text("BANK TRANSACTION", x + COL_W_IMG / 2, y + IMG_H / 2 - 4, { align: "center" });
        const sc = formDone ? [22, 163, 74] : [180, 100, 0] as [number, number, number];
        doc.setTextColor(...sc as [number, number, number]);
        doc.setFontSize(7);
        doc.text(formDone ? "Form Complete" : "Form Pending", x + COL_W_IMG / 2, y + IMG_H / 2 + 4, { align: "center" });
      } else {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(6.5);
        doc.setTextColor(160, 174, 192);
        doc.text("No image", x + COL_W_IMG / 2, y + IMG_H / 2, { align: "center" });
      }

      // Info strip
      const iy = y + IMG_H + INFO_GAP;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(220, 228, 236);
      doc.rect(x, iy, COL_W_IMG, INFO_H, "FD");
      doc.setFillColor(239, 68, 68);
      doc.rect(x, iy, COL_W_IMG, 1.2, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(5, 15, 35);
      doc.text(doc.splitTextToSize(r.vendor_name, COL_W_IMG - 22)[0], x + 3, iy + 6.5);
      doc.text(`$${Number(r.amount).toFixed(2)}`, x + COL_W_IMG - 3, iy + 6.5, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text(fmtDate(r.transaction_date), x + 3, iy + 12.5);
      const rowData = rows[r.id];
      const expLabel = rowData?.expenseType
        ? doc.splitTextToSize(rowData.expenseType, COL_W_IMG - 6)[0]
        : r.category;
      doc.text(expLabel, x + 3, iy + 18.5);
    });

    y += CELL_H + ROW_GAP;
  });

  pdfFooter(doc, PW, PH);
  doc.save(`Overdue_Expense_Report_${header.month.replace(/\s+/g, "_") || new Date().toLocaleDateString("en-US").replace(/\//g, "-")}.pdf`);
}

/* ─── Main ArchiveForm component ─────────────────────────── */
export default function ArchiveForm({
  receipts: initialReceipts,
  userId,
  defaultName,
  defaultOffice,
}: {
  receipts: Receipt[];
  userId: string;
  defaultName: string;
  defaultOffice: string;
}) {
  const KEY = storageKey(userId);

  const [receipts, setReceipts] = useState<Receipt[]>(initialReceipts);

  const [formData, setFormData] = useState<FormData>(() => {
    // Build initial rows from receipts
    const initialRows: Record<string, RowData> = {};
    initialReceipts.forEach(r => { initialRows[r.id] = defaultRow(r); });

    return {
      header: {
        name:   defaultName,
        office: defaultOffice,
        month:  deriveMonth(initialReceipts),
      },
      rows: initialRows,
    };
  });

  const [exporting,      setExporting]      = useState(false);
  const [formCollapsed,  setFormCollapsed]  = useState(false);
  const [collapsedCards, setCollapsedCards] = useState<Set<string>>(new Set());
  const [showSignModal,  setShowSignModal]  = useState(false);

  // Load persisted data from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) {
        const parsed: FormData = JSON.parse(stored);
        setFormData(prev => {
          const merged: Record<string, RowData> = {};
          receipts.forEach(r => {
            merged[r.id] = parsed.rows?.[r.id] ?? defaultRow(r);
          });
          return {
            header: parsed.header ?? prev.header,
            rows: merged,
          };
        });
        // Auto-collapse cards that already have an expense type saved
        const alreadySaved = new Set(
          receipts
            .filter(r => !!parsed.rows?.[r.id]?.expenseType)
            .map(r => r.id)
        );
        setCollapsedCards(alreadySaved);
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save to localStorage whenever formData changes
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(formData));
    } catch { /* ignore */ }
  }, [formData, KEY]);

  const updateHeader = useCallback((field: keyof FormData["header"], value: string) => {
    setFormData(prev => ({ ...prev, header: { ...prev.header, [field]: value } }));
  }, []);

  const updateRow = useCallback((receiptId: string, field: keyof RowData, value: string) => {
    setFormData(prev => ({
      ...prev,
      rows: {
        ...prev.rows,
        [receiptId]: { ...prev.rows[receiptId], [field]: value },
      },
    }));
  }, []);

  const toggleCard = useCallback((id: string) => {
    setCollapsedCards(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const saveCard = useCallback((id: string) => {
    setFormData(prev => {
      try { localStorage.setItem(KEY, JSON.stringify(prev)); } catch { /* ignore */ }
      return prev;
    });
  }, [KEY]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/receipts/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      setReceipts(prev => prev.filter(r => r.id !== id));
      setFormData(prev => {
        const rows = { ...prev.rows };
        delete rows[id];
        return { ...prev, rows };
      });
      setCollapsedCards(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      // Clean up localStorage
      try {
        const stored = localStorage.getItem(KEY);
        if (stored) {
          const parsed: FormData = JSON.parse(stored);
          if (parsed.rows) delete parsed.rows[id];
          localStorage.setItem(KEY, JSON.stringify(parsed));
        }
      } catch { /* ignore */ }
    } catch { /* ignore */ }
  }, [KEY]);

  const completedCount = receipts.filter(r => !!formData.rows[r.id]?.expenseType).length;
  const total          = receipts.reduce((s, r) => s + Number(r.amount), 0);

  async function runExport(signature: string) {
    setExporting(true);
    try {
      await exportCombinedPDF(receipts, formData.rows, formData.header, signature);
    } finally {
      setExporting(false);
    }
  }

  function handleExport() {
    // If this batch is already signed, export immediately with the saved signature
    if (isBatchSigned(userId, receipts)) {
      runExport(getBatchSignature(userId, receipts));
      return;
    }
    // Otherwise show the signature modal
    setShowSignModal(true);
  }

  // If all receipts were deleted client-side, show empty state
  if (receipts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-2xl mb-3">✅</p>
        <p className="text-gray-500 text-sm font-medium">No overdue receipts</p>
        <p className="text-gray-400 text-xs mt-1">All your receipts are within the 60-day window.</p>
      </div>
    );
  }

  return (
    <div>
      {/* ── Signature modal ──────────────────────────────────── */}
      {showSignModal && (
        <SignatureModal
          defaultSig={getSavedSignature(userId)}
          onSign={(sig) => {
            signBatch(userId, receipts, sig);
            setShowSignModal(false);
            runExport(sig);
          }}
          onCancel={() => setShowSignModal(false)}
        />
      )}

      {/* ── Section header — collapses entire form ───────────── */}
      <button
        type="button"
        onClick={() => setFormCollapsed(c => !c)}
        className="w-full flex items-center justify-between mb-4 px-1 py-1 rounded-xl transition-colors hover:bg-black/[0.03] active:bg-black/[0.05]">
        <div className="flex items-center gap-2 min-w-0">
          <svg
            width="14" height="14" viewBox="0 0 14 14" fill="none"
            className="flex-shrink-0 transition-transform duration-200"
            style={{ transform: formCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}>
            <path d="M3 5l4 4 4-4" stroke="#9ca3af" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div className="text-left min-w-0">
            <h2 className="text-sm font-bold" style={{ color: "#00283C" }}>Overdue Expenses</h2>
            <p className="text-[11px] text-gray-400">
              {completedCount} of {receipts.length} categorized
            </p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-bold" style={{ color: "#00283C" }}>${total.toFixed(2)}</p>
          <p className="text-[11px] text-gray-400">
            {receipts.length} receipt{receipts.length !== 1 ? "s" : ""}
          </p>
        </div>
      </button>

      {/* ── Collapsible body ─────────────────────────────────── */}
      {!formCollapsed && (
        <>
      {/* ── Form Header ──────────────────────────────────────── */}
      <div
        className="rounded-2xl mb-6 p-4"
        style={{ background: "#00283C", border: "1px solid #00283C", boxShadow: "0 2px 12px rgba(0,40,60,0.18)" }}>
        <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "#00D6F2" }}>
          Form Header
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>Employee Name</label>
            <input
              type="text"
              value={formData.header.name}
              onChange={e => updateHeader("name", e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff" }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>Office</label>
              <input
                type="text"
                value={formData.header.office}
                onChange={e => updateHeader("office", e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff" }}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>Month</label>
              <input
                type="text"
                value={formData.header.month}
                onChange={e => updateHeader("month", e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Progress bar ─────────────────────────────────────── */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex-1 mr-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-gray-500">
              {completedCount} of {receipts.length} receipts categorized
            </span>
            <span className="text-[11px] font-semibold" style={{ color: "#00283C" }}>
              ${total.toFixed(2)} total
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#e2e8f0" }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${receipts.length ? (completedCount / receipts.length) * 100 : 0}%`,
                background: completedCount === receipts.length ? "#22c55e" : "#00D6F2",
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Receipt form cards ────────────────────────────────── */}
      {receipts.map(receipt => (
        <ReceiptFormCard
          key={receipt.id}
          receipt={receipt}
          row={formData.rows[receipt.id] ?? defaultRow(receipt)}
          collapsed={collapsedCards.has(receipt.id)}
          onChange={(field, value) => updateRow(receipt.id, field, value)}
          onToggle={() => toggleCard(receipt.id)}
          onSave={() => saveCard(receipt.id)}
          onDelete={() => handleDelete(receipt.id)}
        />
      ))}

      {/* ── Export button ─────────────────────────────────────── */}
      <button
        onClick={handleExport}
        disabled={exporting}
        className="w-full py-3 rounded-xl text-sm font-bold transition-all mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: "#00283C", color: "#ffffff" }}>
        {exporting ? "Generating…" : isBatchSigned(userId, receipts) ? "Export Full Report" : "Sign & Export Full Report"}
      </button>
      <p className="text-[11px] text-center text-gray-400 mt-2">
        Exports paper form + all receipt images · Progress auto-saves as you type
      </p>
        </>
      )}
    </div>
  );
}
