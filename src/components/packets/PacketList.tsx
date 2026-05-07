"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { daysOld, isPolicyApplicable } from "@/types";
import type { Receipt, Packet } from "@/types";
import MissingReceiptSheet from "@/components/receipts/MissingReceiptSheet";
import ReceiptDetailModal from "@/components/receipts/ReceiptDetailModal";
import { trackEvent } from "@/lib/track";

/* ─── Days badge ─────────────────────────────────────────── */
function DaysBadge({ days, country }: { days: number; country: string }) {
  if (!isPolicyApplicable(country as "US" | "CA")) return <span className="badge-ok">{days}d</span>;
  if (days >= 61) return <span className="badge-overdue">{days}d — overdue</span>;
  if (days >= 55) return <span className="badge-warn">{days}d — expiring</span>;
  return <span className="badge-ok">{days}d</span>;
}

/* ─── Form icon ──────────────────────────────────────────── */
function FormIconButton({ completed, onClick }: {
  completed: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      onClick={onClick}
      title={completed ? "View Missing Receipt Form" : "Missing Receipt Form — action needed"}
      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform active:scale-90"
      style={{
        background: completed ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.15)",
        border: `1px solid ${completed ? "rgba(34,197,94,0.3)" : "rgba(245,158,11,0.3)"}`,
      }}>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <rect x="2.5" y="1" width="9" height="12" rx="1.8"
          stroke={completed ? "#4ade80" : "#fbbf24"} strokeWidth="1.3"/>
        <path d="M5 5h5M5 7.2h5M5 9.4h3"
          stroke={completed ? "#4ade80" : "#fbbf24"} strokeWidth="1.1" strokeLinecap="round"/>
        {completed ? (
          <>
            <circle cx="12.2" cy="12.5" r="2.8" fill="rgba(34,197,94,0.2)" stroke="#4ade80" strokeWidth="1"/>
            <path d="M11.2 12.5l.8.8 1.4-1.4" stroke="#4ade80" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
          </>
        ) : (
          <>
            <circle cx="12.2" cy="12.5" r="2.8" fill="rgba(245,158,11,0.2)" stroke="#fbbf24" strokeWidth="1"/>
            <path d="M12.2 10.8v1.5M12.2 13.6v.2" stroke="#fbbf24" strokeWidth="1.1" strokeLinecap="round"/>
          </>
        )}
      </svg>
    </button>
  );
}

/* ─── Receipt card ───────────────────────────────────────── */

const CARD_BG    = "#ffffff";
const WARN_BG    = "#fffbeb";
const OVERDUE_BG = "#fef2f2";

const categoryEmoji: Record<string, string> = {
  meals: "🍽️", lodging: "🏨", transit: "🚗", other: "📄",
};

function ReceiptCard({
  receipt, country,
  onFormIconClick, onViewClick, onDelete, onEditClick,
}: {
  receipt: Receipt; country: string;
  onFormIconClick: (r: Receipt) => void;
  onViewClick:     (r: Receipt) => void;
  onDelete:        (id: string) => void;
  onEditClick?:    (r: Receipt) => void;
}) {
  const days      = daysOld(receipt.transaction_date);
  const isBank    = receipt.source === "bank_transaction";
  const formDone  = !!receipt.missing_receipt_form?.completed_at;
  const needsForm = isBank && !formDone;
  const isOverdue = isPolicyApplicable(country as "US" | "CA") && days >= 61;

  const [offset,     setOffset]     = useState(0);
  const [confirming, setConfirming] = useState(false);
  const startX = useRef<number | null>(null);
  const REVEAL = 130;

  const onTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; };
  const onTouchMove  = (e: React.TouchEvent) => {
    if (startX.current === null) return;
    const delta = startX.current - e.touches[0].clientX;
    setOffset(Math.max(0, Math.min(REVEAL, delta)));
  };
  const onTouchEnd = () => {
    setOffset(prev => (prev > REVEAL / 2 ? REVEAL : 0));
    startX.current = null;
  };

  // Pick the right card background
  const cardBg = isOverdue ? OVERDUE_BG : needsForm ? WARN_BG : CARD_BG;
  const cardBorder = isOverdue
    ? "rgba(239,68,68,0.3)"
    : needsForm
      ? "rgba(245,158,11,0.35)"
      : "#e2e8f0";

  return (
    <>
      {/* Inline delete confirmation */}
      {confirming && (
        <div
          className="mb-2 px-4 py-3 rounded-2xl flex items-center justify-between gap-3"
          style={{ background: "#fef2f2", border: "1px solid rgba(239,68,68,0.25)" }}>
          <p className="text-xs font-semibold text-red-600">Delete this receipt?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600"
              style={{ background: "#f1f5f9", border: "1px solid #e2e8f0" }}>
              Cancel
            </button>
            <button
              onClick={() => { setConfirming(false); onDelete(receipt.id); }}
              className="px-3 py-1.5 rounded-lg bg-red-500 text-xs font-semibold text-white">
              Delete
            </button>
          </div>
        </div>
      )}

      <div className="group relative overflow-hidden rounded-2xl mb-2">
        {/* Action buttons behind (swipe reveals) */}
        <div className="absolute right-0 top-0 bottom-0 flex items-stretch">
          <button
            onClick={() => { setOffset(0); onEditClick?.(receipt); }}
            className="w-16 flex flex-col items-center justify-center gap-1 text-white text-[10px] font-bold"
            style={{ background: "rgba(0,150,200,0.85)", borderRadius: "0 12px 12px 0" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 14l1.5-5.5L11 1l3 3-7.5 7.5L2 14z" stroke="white" strokeWidth="1.4" strokeLinejoin="round"/>
            </svg>
            Edit
          </button>
          <button
            onClick={() => { setOffset(0); setConfirming(true); }}
            className="w-16 flex flex-col items-center justify-center gap-1 text-white text-[10px] font-bold"
            style={{ background: "rgba(200,40,40,0.85)", borderRadius: "0 12px 12px 0" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 4h10M5 4V3h6v1M6 7v4M10 7v4" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
              <rect x="3.5" y="4" width="9" height="9" rx="1.5" stroke="white" strokeWidth="1.4"/>
            </svg>
            Delete
          </button>
        </div>

        {/* Sliding card */}
        <div
          className="group flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer"
          style={{
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            transform: `translateX(-${offset}px)`,
            transition: startX.current ? "none" : "transform 0.2s ease",
            boxSizing: "border-box",
          }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onClick={() => { if (offset === 0) onViewClick(receipt); }}
        >
          {/* Emoji */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
            style={{ background: "#f1f5f9" }}>
            {categoryEmoji[receipt.category] ?? "📄"}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: "#00283C" }}>{receipt.vendor_name}</p>
            <p className="text-[11px] mt-0.5 text-gray-400">
              {new Date(receipt.transaction_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              {" · "}{receipt.category}{" · "}{receipt.source.replace("_", " ")}
            </p>
          </div>

          {/* Amount + badge */}
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className="text-sm font-semibold" style={{ color: "#00283C" }}>
              ${Number(receipt.amount).toFixed(2)}
            </span>
            <DaysBadge days={days} country={country} />
          </div>

          {/* Form icon */}
          {isBank && (
            <FormIconButton
              completed={formDone}
              onClick={(e) => { e.stopPropagation(); onFormIconClick(receipt); }}
            />
          )}

          {/* Desktop hover actions */}
          <button
            onClick={(e) => { e.stopPropagation(); onEditClick?.(receipt); }}
            title="Edit receipt"
            className="hidden md:flex flex-shrink-0 w-7 h-7 rounded-lg items-center justify-center transition-all opacity-0 group-hover:opacity-100"
            style={{ color: "#9ca3af" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#00D6F2")}
            onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M2 14l1.5-5.5L11 1l3 3-7.5 7.5L2 14z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
            title="Delete receipt"
            className="hidden md:flex flex-shrink-0 w-7 h-7 rounded-lg items-center justify-center transition-all opacity-0 group-hover:opacity-100"
            style={{ color: "#9ca3af" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
            onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M3 4h10M5 4V3h6v1M6 7v4M10 7v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <rect x="3.5" y="4" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
            </svg>
          </button>
        </div>
      </div>
    </>
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
      img.onload  = () => ok({ w: img.naturalWidth,  h: img.naturalHeight });
      img.onerror = () => ok({ w: 1, h: 1 });
      img.src = data;
    });
    return { data, fmt: blob.type.includes("png") ? "PNG" : "JPEG", natW: w, natH: h };
  } catch {
    return null;
  }
}

/* ─── PDF export ─────────────────────────────────────────── */
async function exportPDF(packet: Packet & { receipts: Receipt[] }, userName: string) {
  const { default: jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const PW  = 215.9;
  const PH  = 279.4;
  const ML  = 14;
  const MR  = 14;
  const CW  = PW - ML - MR;

  const receipts = packet.receipts;
  const total    = receipts.reduce((s, r) => s + Number(r.amount), 0);
  const cap      = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const fmtDate  = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const COLS     = 3;
  const COL_GAP  = 5;
  const ROW_GAP  = 8;
  const COL_W    = (CW - COL_GAP * (COLS - 1)) / COLS;
  const IMG_H    = 74;
  const INFO_GAP = 2.5;
  const INFO_H   = 24;
  const CELL_H   = IMG_H + INFO_GAP + INFO_H;

  const imgCache: Record<string, Awaited<ReturnType<typeof fetchImgBase64>>> = {};
  await Promise.all(
    receipts.filter(r => r.image_url).map(async r => {
      imgCache[r.id] = await fetchImgBase64(r.image_url!);
    })
  );

  const drawHeader = () => {
    doc.setFillColor(0, 40, 60);
    doc.rect(0, 0, PW, 36, "F");
    doc.setFillColor(0, 214, 242);
    doc.rect(0, 0, 4, 36, "F");
    doc.setTextColor(0, 214, 242);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("INSIGHT GLOBAL LLC", ML + 2, 9);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text("Expense Receipt Packet", ML + 2, 21);
    doc.setFontSize(9);
    doc.setTextColor(0, 214, 242);
    doc.text(packet.label, PW - MR, 21, { align: "right" });
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(160, 200, 215);
    doc.text(`${userName}  ·  ${fmtDate(packet.date_from)} – ${fmtDate(packet.date_to)}`, ML + 2, 29);
    doc.text(`Generated: ${new Date().toLocaleDateString("en-US")}`, PW - MR, 29, { align: "right" });
  };

  drawHeader();

  const photoCount = receipts.filter(r => r.source !== "bank_transaction").length;
  const bankCount  = receipts.length - photoCount;

  doc.setFillColor(241, 245, 249);
  doc.rect(0, 36, PW, 15, "F");
  doc.setDrawColor(220, 228, 236);
  doc.setLineWidth(0.3);
  doc.line(0, 51, PW, 51);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(0, 40, 60);
  doc.text(`$${total.toFixed(2)}`, ML + 2, 46);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Total  ·  ${receipts.length} receipt${receipts.length !== 1 ? "s" : ""}  ·  ${photoCount} itemized  ·  ${bankCount} bank`,
    ML + 30, 46
  );

  let y = 57;

  const rows: (typeof receipts)[] = [];
  for (let i = 0; i < receipts.length; i += COLS) rows.push(receipts.slice(i, i + COLS));

  rows.forEach((row) => {
    if (y + CELL_H > PH - 18) {
      pdfFooter(doc, PW, PH);
      doc.addPage();
      y = 16;
    }

    row.forEach((r, col) => {
      const x        = ML + col * (COL_W + COL_GAP);
      const img      = imgCache[r.id] ?? null;
      const isBank   = r.source === "bank_transaction";
      const formDone = !!r.missing_receipt_form?.completed_at;

      doc.setFillColor(245, 247, 250);
      doc.setDrawColor(220, 228, 236);
      doc.setLineWidth(0.25);
      doc.rect(x, y, COL_W, IMG_H, "FD");

      if (img) {
        let iW = COL_W - 2;
        let iH = (img.natH / img.natW) * iW;
        if (iH > IMG_H - 2) { iH = IMG_H - 2; iW = (img.natW / img.natH) * iH; }
        const xImg = x + (COL_W - iW) / 2;
        const yImg = y + (IMG_H - iH) / 2;
        doc.addImage(img.data, img.fmt, xImg, yImg, iW, iH);
      } else if (isBank) {
        const fd = r.missing_receipt_form;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text("BANK TRANSACTION", x + COL_W / 2, y + IMG_H / 2 - 6, { align: "center" });
        doc.text("No receipt image", x + COL_W / 2, y + IMG_H / 2 - 1, { align: "center" });
        const statusColor = formDone ? [22, 163, 74] : [180, 100, 0] as [number,number,number];
        doc.setTextColor(...statusColor as [number,number,number]);
        doc.setFontSize(7);
        doc.text(
          formDone ? "Form Complete" : "Form Pending",
          x + COL_W / 2, y + IMG_H / 2 + 6,
          { align: "center" }
        );
        if (fd?.business_purpose) {
          doc.setFont("helvetica", "italic");
          doc.setFontSize(6);
          doc.setTextColor(130, 145, 165);
          const bpLines = doc.splitTextToSize(fd.business_purpose, COL_W - 8);
          doc.text(bpLines.slice(0, 2), x + COL_W / 2, y + IMG_H / 2 + 14, { align: "center" });
        }
      } else {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(6.5);
        doc.setTextColor(160, 174, 192);
        doc.text("No image", x + COL_W / 2, y + IMG_H / 2, { align: "center" });
      }

      const iy = y + IMG_H + INFO_GAP;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(220, 228, 236);
      doc.setLineWidth(0.25);
      doc.rect(x, iy, COL_W, INFO_H, "FD");
      doc.setFillColor(0, 214, 242);
      doc.rect(x, iy, COL_W, 1.2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(5, 15, 35);
      const vendorStr = doc.splitTextToSize(r.vendor_name, COL_W - 22)[0];
      doc.text(vendorStr, x + 3, iy + 6.5);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(0, 40, 60);
      doc.text(`$${Number(r.amount).toFixed(2)}`, x + COL_W - 3, iy + 6.5, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text(fmtDate(r.transaction_date), x + 3, iy + 12.5);
      doc.text(cap(r.category), x + COL_W - 3, iy + 12.5, { align: "right" });
      doc.setFontSize(5.8);
      doc.setTextColor(160, 174, 192);
      if (r.notes) {
        const noteLine = doc.splitTextToSize(r.notes, COL_W - 6)[0];
        doc.text(noteLine, x + 3, iy + 18.5);
      } else {
        doc.text(r.source.replace(/_/g, " "), x + 3, iy + 18.5);
      }
    });

    y += CELL_H + ROW_GAP;
  });

  if (y + 16 > PH - 18) { pdfFooter(doc, PW, PH); doc.addPage(); y = 16; }
  y += 2;
  doc.setDrawColor(0, 40, 60);
  doc.setLineWidth(0.5);
  doc.line(ML, y, ML + CW, y);
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0, 40, 60);
  doc.text("Grand Total", ML + 2, y);
  doc.setFontSize(12);
  doc.text(`$${total.toFixed(2)} USD`, PW - MR, y, { align: "right" });

  pdfFooter(doc, PW, PH);
  doc.save(`${packet.label.replace(/\s+/g, "_")}_expense_packet.pdf`);
}

/* ─── Main component ─────────────────────────────────────── */
export default function PacketList({
  packets, country, userName = "Employee",
}: {
  packets: (Packet & { receipts: Receipt[] })[];
  country: string;
  userName?: string;
}) {
  const [sheetReceipt,  setSheetReceipt]  = useState<Receipt | null>(null);
  const [detailReceipt, setDetailReceipt] = useState<Receipt | null>(null);
  const [localPackets,  setLocalPackets]  = useState(packets);
  const [editMode,      setEditMode]      = useState(false);

  async function handleDelete(receiptId: string) {
    const res = await fetch(`/api/receipts/${receiptId}`, { method: "DELETE" });
    if (res.ok) {
      trackEvent("receipt_deleted", { receipt_id: receiptId });
      setLocalPackets(prev =>
        prev.map(p => ({ ...p, receipts: p.receipts.filter(r => r.id !== receiptId) }))
          .filter(p => p.receipts.length > 0)
      );
    }
  }

  const pendingForms = localPackets
    .flatMap(p => p.receipts ?? [])
    .filter(r => r.source === "bank_transaction" && !r.missing_receipt_form?.completed_at);

  const blockedReceipts = localPackets
    .flatMap(p => p.receipts ?? [])
    .filter(r => isPolicyApplicable(country as "US" | "CA") && daysOld(r.transaction_date) >= 61);

  if (localPackets.length === 0) return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-2xl mb-3">📋</p>
      <p className="text-sm font-medium text-gray-500">No packets yet</p>
      <p className="text-xs mt-1 text-gray-400">Add a receipt to get started</p>
      <Link href="/capture" className="mt-6 btn-primary max-w-[160px]">Add Receipt</Link>
    </div>
  );

  return (
    <>
      {/* ── Alert banners ──────────────────────────────────────────────── */}
      {blockedReceipts.length > 0 && (
        <div
          className="mb-4 px-4 py-3 rounded-2xl"
          style={{ background: "#fef2f2", border: "1px solid rgba(239,68,68,0.25)" }}>
          <p className="text-xs font-semibold text-red-600">
            {blockedReceipts.length} receipt{blockedReceipts.length > 1 ? "s" : ""} overdue — remove before exporting
          </p>
        </div>
      )}
      {pendingForms.length > 0 && (
        <div
          className="mb-4 px-4 py-3 rounded-2xl"
          style={{ background: "#fffbeb", border: "1px solid rgba(245,158,11,0.3)" }}>
          <p className="text-xs font-semibold text-amber-700">
            {pendingForms.length} missing receipt form{pendingForms.length > 1 ? "s" : ""} need attention — tap the 📋 icon
          </p>
        </div>
      )}

      <div className="space-y-6">
        {localPackets.map(packet => {
          const receipts   = packet.receipts ?? [];
          const total      = receipts.reduce((s, r) => s + Number(r.amount), 0);
          const hasBlocked = receipts.some(r => isPolicyApplicable(country as "US" | "CA") && daysOld(r.transaction_date) >= 61);
          const hasPending = receipts.some(r => r.source === "bank_transaction" && !r.missing_receipt_form?.completed_at);
          const canExport  = !hasBlocked && !hasPending;

          return (
            <div key={packet.id}>
              {/* Packet header */}
              <div className="flex items-center justify-between mb-2 px-1">
                <div>
                  <h2 className="text-sm font-bold" style={{ color: "#00283C" }}>{packet.label}</h2>
                  <p className="text-[11px] text-gray-400">
                    {new Date(packet.date_from).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    {" – "}
                    {new Date(packet.date_to).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    {packet.client_name && ` · ${packet.client_name}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold" style={{ color: "#00283C" }}>${total.toFixed(2)}</p>
                  <p className="text-[11px] text-gray-400">{receipts.length} receipts</p>
                </div>
              </div>

              {receipts.map(r => (
                <ReceiptCard
                  key={r.id}
                  receipt={r}
                  country={country}
                  onViewClick={(r) => { setEditMode(false); setDetailReceipt(r); }}
                  onFormIconClick={setSheetReceipt}
                  onDelete={handleDelete}
                  onEditClick={(r) => { setEditMode(true); setDetailReceipt(r); }}
                />
              ))}

              {/* Export row */}
              <div className="flex items-center justify-end gap-2 mt-3">
                {!canExport && (
                  <p className="text-[11px] flex-1 text-amber-600">
                    {hasPending ? "Complete forms to export" : "Remove overdue receipts first"}
                  </p>
                )}
                <button
                  disabled={!canExport}
                  onClick={() => {
                    if (canExport) {
                      exportPDF(packet, userName);
                      trackEvent("pdf_exported", { packet_id: packet.id, receipt_count: receipts.length });
                    }
                  }}
                  className="px-5 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={canExport
                    ? { background: "#00D6F2", color: "#00283C" }
                    : { background: "#f1f5f9", color: "#9ca3af", border: "1px solid #e2e8f0" }
                  }>
                  Export PDF
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {sheetReceipt && (
        <MissingReceiptSheet
          receipt={sheetReceipt}
          open={!!sheetReceipt}
          onClose={() => setSheetReceipt(null)}
          onSaved={() => window.location.reload()}
        />
      )}

      {detailReceipt && (
        <ReceiptDetailModal
          receipt={detailReceipt}
          onClose={() => { setDetailReceipt(null); setEditMode(false); }}
          initialEditing={editMode}
          onUpdated={(updated) => {
            const id = detailReceipt.id;
            setLocalPackets(prev => prev.map(p => ({
              ...p,
              receipts: p.receipts.map(r =>
                r.id === id ? { ...r, ...updated } as Receipt : r
              ),
            })));
            setDetailReceipt(prev => prev ? { ...prev, ...updated } as Receipt : null);
          }}
        />
      )}
    </>
  );
}
