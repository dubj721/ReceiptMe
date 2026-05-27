"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ReceiptCategory } from "@/types";
import ClearableInput from "@/components/ui/ClearableInput";

type Source = "photo" | "bank_transaction" | "bank_statement";
type Step   = "source" | "upload" | "processing" | "line-picker" | "bulk-review" | "form" | "missing-form" | "success";

interface ReceiptForm {
  vendor_name:      string;
  transaction_date: string;
  amount:           string;
  currency:         string;
  category:         ReceiptCategory;
  notes:            string;
}

interface MissingForm {
  business_purpose: string;
  reason:           string;
  signature:        string;
}

interface StatementRow {
  date:    string;
  isoDate: string;
  vendor:  string;
  amount:  string;
  rawText: string;
  bbox:    { x: number; y: number; w: number; h: number };
}

interface BulkLine {
  row:  StatementRow;
  form: ReceiptForm;
}

const CATEGORIES: { value: ReceiptCategory; label: string; emoji: string }[] = [
  { value: "meals",   label: "Meals",   emoji: "🍽️" },
  { value: "lodging", label: "Lodging", emoji: "🏨" },
  { value: "transit", label: "Transit", emoji: "🚗" },
  { value: "other",   label: "Other",   emoji: "📄" },
];

const EMPTY: ReceiptForm = {
  vendor_name:      "",
  transaction_date: new Date().toISOString().split("T")[0],
  amount:           "",
  currency:         "USD",
  category:         "meals",
  notes:            "",
};

function inferCategory(vendor: string): ReceiptCategory {
  const v = vendor.toLowerCase();
  if (/hotel|inn|resort|marriott|hilton|hyatt|courtyard|sheraton|westin/.test(v)) return "lodging";
  if (/air|airline|flight|uber|lyft|taxi|transit|delta|united|southwest|jetblue/.test(v)) return "transit";
  if (/restaurant|cafe|coffee|starbucks|lunch|dinner|grill|food|pizza|taco|burger|sushi/.test(v)) return "meals";
  return "other";
}

function SourceCard({ icon, title, subtitle, onClick, disabled }: {
  icon: string; title: string; subtitle: string;
  onClick?: () => void; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`w-full text-left px-4 py-4 rounded-2xl border transition-all
        ${disabled
          ? "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
          : "border-gray-200 bg-white hover:border-brand-cyan hover:shadow-sm active:scale-[0.98]"
        }`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
        </div>
        {!disabled && (
          <svg className="ml-auto text-gray-300" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        )}
      </div>
    </button>
  );
}

function UploadZone({ preview, onFile, label }: {
  preview: string | null;
  onFile:  (f: File) => void;
  label?:  string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <button onClick={() => inputRef.current?.click()}
      className="w-full rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50
                 flex flex-col items-center justify-center gap-2 transition-colors
                 hover:border-brand-cyan hover:bg-brand-cyan/5"
      style={{ minHeight: 200 }}>
      {preview ? (
        <img src={preview} alt="Preview"
          className="w-full rounded-2xl object-cover" style={{ maxHeight: 280 }} />
      ) : (
        <>
          <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100
                          flex items-center justify-center shadow-sm">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 16V8M8 12l4-4 4 4" stroke="#9ca3af" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="3" y="3" width="18" height="18" rx="4" stroke="#e5e7eb" strokeWidth="1.5"/>
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500">{label ?? "Tap to upload image"}</p>
          <p className="text-xs text-gray-400">JPG, PNG or HEIC</p>
        </>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
    </button>
  );
}

export default function CapturePage() {
  const router   = useRouter();
  const supabase = createClient();

  const [step,        setStep]        = useState<Step>("source");
  const [source,      setSource]      = useState<Source>("photo");
  const [preview,     setPreview]     = useState<string | null>(null);
  const [imageFile,   setImageFile]   = useState<File | null>(null);
  const [form,        setForm]        = useState<ReceiptForm>(EMPTY);
  const [mForm,       setMForm]       = useState<MissingForm>({ business_purpose: "", reason: "", signature: "" });
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [receiptId,   setReceiptId]   = useState<string | null>(null);
  const [isOverdue,   setIsOverdue]   = useState(false);

  // Bank statement state
  const [stmtRows,          setStmtRows]          = useState<StatementRow[]>([]);
  const [selectedRows,      setSelectedRows]      = useState<StatementRow[]>([]);
  const [bulkLines,         setBulkLines]         = useState<BulkLine[]>([]);
  const [compressedDataUrl, setCompressedDataUrl] = useState<string | null>(null);
  const [compressedDims,    setCompressedDims]    = useState<{ w: number; h: number } | null>(null);
  const [saveProgress,      setSaveProgress]      = useState<{ current: number; total: number } | null>(null);
  const [savedCount,        setSavedCount]        = useState(0);

  const handleFile = useCallback((file: File) => {
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  }, []);

  async function compressImage(file: File): Promise<{
    b64: string; mime: string; dataUrl: string; w: number; h: number;
  }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX = 1200;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round((height / width) * MAX); width = MAX; }
          else                { width  = Math.round((width / height) * MAX); height = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width  = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        resolve({ b64: dataUrl.split(",")[1], mime: "image/jpeg", dataUrl, w: width, h: height });
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  async function processImage() {
    if (!imageFile) { setStep("form"); return; }
    setStep("processing");
    if (source === "bank_statement") {
      await processStatement();
      return;
    }
    try {
      const { b64, mime } = await compressImage(imageFile);
      const resp = await fetch("/api/receipts/ocr", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ image_b64: b64, mime_type: mime }),
      });
      if (resp.ok) {
        const ext = await resp.json();
        setForm(prev => ({
          ...prev,
          vendor_name:      ext.vendor_name      || prev.vendor_name,
          transaction_date: ext.transaction_date || prev.transaction_date,
          amount:           ext.amount           || prev.amount,
          category:         ext.category         || prev.category,
        }));
      }
    } catch { /* OCR failed — user fills manually */ }
    setStep("form");
  }

  async function processStatement() {
    if (!imageFile) { setStep("line-picker"); return; }
    try {
      const compressed = await compressImage(imageFile);
      setCompressedDataUrl(compressed.dataUrl);
      setCompressedDims({ w: compressed.w, h: compressed.h });
      const resp = await fetch("/api/receipts/ocr-statement", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          image_b64:    compressed.b64,
          mime_type:    compressed.mime,
          image_width:  compressed.w,
          image_height: compressed.h,
        }),
      });
      if (resp.ok) {
        const { rows } = await resp.json();
        setStmtRows(rows ?? []);
      }
    } catch { /* OCR failed */ }
    setStep("line-picker");
  }

  function toggleRow(row: StatementRow) {
    setSelectedRows(prev =>
      prev.includes(row) ? prev.filter(r => r !== row) : [...prev, row]
    );
  }

  // Build BulkLine array and advance to bulk-review, or fall through to manual form
  function confirmSelection() {
    if (selectedRows.length === 0) {
      setStep("form");
      return;
    }
    const lines: BulkLine[] = selectedRows.map(row => ({
      row,
      form: {
        vendor_name:      row.vendor,
        transaction_date: row.isoDate || new Date().toISOString().split("T")[0],
        amount:           row.amount,
        currency:         "USD",
        category:         inferCategory(row.vendor),
        notes:            "",
      },
    }));
    setBulkLines(lines);
    setStep("bulk-review");
  }

  // Canvas: draw original image + amber highlight for one row, upload, return URL
  async function annotateAndUpload(row: StatementRow): Promise<string | null> {
    if (!compressedDataUrl || !compressedDims) return null;
    const canvas = document.createElement("canvas");
    canvas.width  = compressedDims.w;
    canvas.height = compressedDims.h;
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.src = compressedDataUrl;
    await new Promise<void>(res => { img.onload = () => res(); });
    ctx.drawImage(img, 0, 0);
    const { x, y, w, h } = row.bbox;
    ctx.fillStyle = "rgba(254,249,195,0.6)";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(0, y, 5, h); // amber left accent bar
    const blob = await new Promise<Blob>(res => canvas.toBlob(b => res(b!), "image/jpeg", 0.92));
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const path = `${user.id}/stmt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jpg`;
    const { error: uploadErr } = await supabase.storage
      .from("receipts").upload(path, blob, { cacheControl: "3600", upsert: false });
    if (uploadErr) return null;
    return supabase.storage.from("receipts").getPublicUrl(path).data?.publicUrl ?? null;
  }

  // Save all bulk lines: annotate each image, create receipt + missing form per line
  async function saveAllLines() {
    setSaving(true);
    setError(null);
    setSaveProgress({ current: 0, total: bulkLines.length });
    let count = 0;

    for (let i = 0; i < bulkLines.length; i++) {
      setSaveProgress({ current: i + 1, total: bulkLines.length });
      const { row, form: lineForm } = bulkLines[i];
      try {
        const image_url = await annotateAndUpload(row);
        const receiptResp = await fetch("/api/receipts", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            ...lineForm,
            amount:    parseFloat(lineForm.amount),
            source:    "bank_statement",
            image_url,
          }),
        });
        if (!receiptResp.ok) continue;
        const { id: rid } = await receiptResp.json();
        await fetch(`/api/missing-forms/${rid}`, {
          method:  "PUT",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ ...mForm, completed_at: new Date().toISOString() }),
        });
        count++;
      } catch { /* skip this line, continue */ }
    }

    setSavedCount(count);
    setSaving(false);
    setSaveProgress(null);
    setStep("success");
  }

  async function uploadImage(): Promise<string | null> {
    if (!imageFile) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const ext  = imageFile.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("receipts").upload(path, imageFile, { cacheControl: "3600", upsert: false });
    if (error) return null;
    return supabase.storage.from("receipts").getPublicUrl(path).data?.publicUrl ?? null;
  }

  async function saveReceipt() {
    setSaving(true); setError(null);
    try {
      const image_url = await uploadImage();
      const resp = await fetch("/api/receipts", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...form, amount: parseFloat(form.amount), source, image_url }),
      });
      if (!resp.ok) throw new Error(await resp.text());
      const { id, overdue } = await resp.json();
      setReceiptId(id);
      const daysOld = Math.floor((Date.now() - new Date(form.transaction_date).getTime()) / 86_400_000);
      setIsOverdue(!!overdue || daysOld >= 61);
      const needsForm = source === "bank_transaction" || source === "bank_statement";
      setStep(needsForm ? "missing-form" : "success");
    } catch (e: any) {
      setError(e.message ?? "Something went wrong.");
    } finally { setSaving(false); }
  }

  async function saveMissingForm() {
    if (!receiptId) return;
    setSaving(true); setError(null);
    try {
      const resp = await fetch(`/api/missing-forms/${receiptId}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...mForm, completed_at: new Date().toISOString() }),
      });
      if (!resp.ok) throw new Error(await resp.text());
      setStep("success");
    } catch (e: any) {
      setError(e.message ?? "Something went wrong.");
    } finally { setSaving(false); }
  }

  function resetAll() {
    setStep("source"); setForm(EMPTY); setPreview(null);
    setImageFile(null); setMForm({ business_purpose: "", reason: "", signature: "" });
    setReceiptId(null); setError(null); setIsOverdue(false);
    setStmtRows([]); setSelectedRows([]); setBulkLines([]);
    setCompressedDataUrl(null); setCompressedDims(null);
    setSavedCount(0); setSaveProgress(null);
  }

  const inp  = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-brand-cyan transition-colors";
  const back = (to: Step) => (
    <button onClick={() => setStep(to)}
      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-1">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      Back
    </button>
  );

  // ── SOURCE ────────────────────────────────────────────────────────────
  if (step === "source") return (
    <div className="px-4 pt-2 md:pt-0 pb-8 space-y-3 md:max-w-lg md:mx-auto">
      <SourceCard icon="📷" title="Photo Receipt"
        subtitle="Photograph a paper receipt"
        onClick={() => { setSource("photo"); setStep("upload"); }} />
      <SourceCard icon="💳" title="Bank Transaction"
        subtitle="Single transaction screenshot — form required"
        onClick={() => { setSource("bank_transaction"); setStep("upload"); }} />
      <SourceCard icon="🏦" title="Bank Statement"
        subtitle="Upload a statement — select multiple expenses at once"
        onClick={() => { setSource("bank_statement"); setStep("upload"); }} />
      <SourceCard icon="📧" title="Email Forward"
        subtitle="Forward a receipt email to your inbox" disabled />
      <SourceCard icon="↗️" title="Concur Import"
        subtitle="Pull invoices from your Concur account" disabled />
    </div>
  );

  // ── UPLOAD ────────────────────────────────────────────────────────────
  if (step === "upload") return (
    <div className="px-4 pt-2 md:pt-0 pb-8 space-y-4 md:max-w-lg md:mx-auto">
      {back("source")}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          {source === "photo"            ? "Photo Receipt"
           : source === "bank_statement" ? "Bank Statement"
           : "Bank Transaction Screenshot"}
        </p>
        {source === "bank_statement" && (
          <div className="mb-3 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-xs font-semibold text-amber-700">
              📄 Upload your bank statement. We'll detect all transactions and let you select which ones to expense — each creates a separate highlighted receipt.
            </p>
          </div>
        )}
        <UploadZone
          preview={preview}
          onFile={handleFile}
          label={source === "bank_statement" ? "Tap to upload statement image" : "Tap to upload image"}
        />
      </div>
      <button
        onClick={imageFile ? processImage : () => setStep(source === "bank_statement" ? "line-picker" : "form")}
        className="w-full btn-primary">
        {imageFile
          ? source === "bank_statement" ? "Scan Transactions →" : "Read Receipt →"
          : "Skip, enter manually →"}
      </button>
    </div>
  );

  // ── PROCESSING ────────────────────────────────────────────────────────
  if (step === "processing") return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-brand-cyan/10 flex items-center justify-center animate-pulse">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M3 9V5a2 2 0 012-2h4M15 3h4a2 2 0 012 2v4M21 15v4a2 2 0 01-2 2h-4M9 21H5a2 2 0 01-2-2v-4"
            stroke="#00D6F2" strokeWidth="1.8" strokeLinecap="round"/>
          <circle cx="12" cy="12" r="3" stroke="#00D6F2" strokeWidth="1.5"/>
        </svg>
      </div>
      <p className="text-sm font-semibold text-gray-700">
        {source === "bank_statement" ? "Scanning transactions…" : "Reading your receipt…"}
      </p>
      <p className="text-xs text-gray-400">This only takes a second</p>
    </div>
  );

  // ── LINE PICKER ───────────────────────────────────────────────────────
  if (step === "line-picker") return (
    <div className="px-4 pt-2 md:pt-0 pb-8 space-y-4 md:max-w-lg md:mx-auto">
      {back("upload")}
      <div>
        <p className="text-sm font-bold text-gray-900">Select expenses to submit</p>
        <p className="text-xs text-gray-400 mt-0.5">
          Tap each line you're expensing. Each selected line becomes its own receipt with a highlighted proof image.
        </p>
      </div>

      {/* Statement image preview */}
      {preview && (
        <div className="w-full rounded-2xl overflow-hidden border border-gray-100"
          style={{ maxHeight: 200, overflowY: "auto" }}>
          <img src={preview} alt="Bank statement" className="w-full" />
        </div>
      )}

      {/* Transaction rows */}
      {stmtRows.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
              {stmtRows.length} transaction{stmtRows.length !== 1 ? "s" : ""} detected
            </p>
            {selectedRows.length > 0 && (
              <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#00D6F2" }}>
                {selectedRows.length} selected
              </p>
            )}
          </div>
          {stmtRows.map((row, i) => {
            const isSelected = selectedRows.includes(row);
            return (
              <button key={i}
                onClick={() => toggleRow(row)}
                className={`w-full text-left px-4 py-3 rounded-2xl border transition-all active:scale-[0.99]
                  ${isSelected
                    ? "border-brand-cyan bg-brand-cyan/5"
                    : "border-gray-200 bg-white hover:border-gray-300"
                  }`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "#00283C" }}>
                      {row.vendor}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{row.date}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-bold" style={{ color: "#00283C" }}>
                      ${row.amount}
                    </span>
                    {isSelected ? (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: "#00D6F2" }}>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5"
                            strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-200 flex-shrink-0" />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6 px-4 rounded-2xl border border-gray-100 bg-gray-50">
          <p className="text-sm text-gray-500 font-medium">No transactions auto-detected</p>
          <p className="text-xs text-gray-400 mt-1">
            The statement format wasn't recognized. Enter details manually on the next step.
          </p>
        </div>
      )}

      <button
        onClick={confirmSelection}
        disabled={stmtRows.length > 0 && selectedRows.length === 0}
        className={`w-full btn-primary ${stmtRows.length > 0 && selectedRows.length === 0 ? "opacity-50" : ""}`}>
        {selectedRows.length > 0
          ? `Expense ${selectedRows.length} selected line${selectedRows.length !== 1 ? "s" : ""} →`
          : "Continue manually →"}
      </button>
    </div>
  );

  // ── BULK REVIEW ───────────────────────────────────────────────────────
  if (step === "bulk-review") return (
    <div className="px-4 pt-2 md:pt-0 pb-8 space-y-4 md:max-w-lg md:mx-auto">
      {back("line-picker")}
      <div>
        <p className="text-sm font-bold text-gray-900">
          Review {bulkLines.length} expense{bulkLines.length !== 1 ? "s" : ""}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          Each line will be saved as a separate receipt with its own highlighted proof image.
        </p>
      </div>

      <div className="space-y-3">
        {bulkLines.map((line, i) => (
          <div key={i} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            {/* Card header */}
            <div className="px-4 py-2 flex items-center justify-between"
              style={{ background: "#00283C" }}>
              <p className="text-xs font-bold text-white">
                Expense {i + 1} of {bulkLines.length}
              </p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{line.row.date}</p>
            </div>
            {/* Editable fields */}
            <div className="p-3 space-y-2">
              <div>
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">
                  Vendor
                </label>
                <input className={inp} value={line.form.vendor_name}
                  onChange={e => setBulkLines(prev => prev.map((l, idx) =>
                    idx === i ? { ...l, form: { ...l.form, vendor_name: e.target.value } } : l
                  ))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">
                    Date
                  </label>
                  <input type="date" className={inp} value={line.form.transaction_date}
                    onChange={e => setBulkLines(prev => prev.map((l, idx) =>
                      idx === i ? { ...l, form: { ...l.form, transaction_date: e.target.value } } : l
                    ))} />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">
                    Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input className={`${inp} pl-6`} type="number" min="0" step="0.01"
                      value={line.form.amount}
                      onChange={e => setBulkLines(prev => prev.map((l, idx) =>
                        idx === i ? { ...l, form: { ...l.form, amount: e.target.value } } : l
                      ))} />
                  </div>
                </div>
              </div>
              {/* Category pills */}
              <div>
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">
                  Category
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {CATEGORIES.map(cat => (
                    <button key={cat.value}
                      onClick={() => setBulkLines(prev => prev.map((l, idx) =>
                        idx === i ? { ...l, form: { ...l.form, category: cat.value } } : l
                      ))}
                      className={`flex flex-col items-center gap-0.5 py-2 rounded-xl border text-xs font-medium transition-all
                        ${line.form.category === cat.value
                          ? "bg-brand-navy text-white border-brand-navy"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}>
                      <span className="text-base leading-none">{cat.emoji}</span>
                      <span className="text-[10px]">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200">
        <p className="text-xs font-semibold text-amber-700">
          📋 One Missing Receipt Form will be filled next and attached to all {bulkLines.length} receipt{bulkLines.length !== 1 ? "s" : ""}.
        </p>
      </div>

      <button
        onClick={() => setStep("missing-form")}
        disabled={bulkLines.some(l => !l.form.vendor_name || !l.form.amount)}
        className={`w-full btn-primary ${bulkLines.some(l => !l.form.vendor_name || !l.form.amount) ? "opacity-50" : ""}`}>
        Continue to Form →
      </button>
    </div>
  );

  // ── FORM (photo / bank_transaction / bank_statement manual) ───────────
  if (step === "form") return (
    <div className="px-4 pt-2 md:pt-0 pb-8 space-y-5 md:max-w-lg md:mx-auto">
      {back(source === "bank_statement" ? "line-picker" : "upload")}
      {preview && (
        <div className="w-full rounded-2xl overflow-hidden border border-gray-100 max-h-40">
          <img src={preview} alt="Receipt" className="w-full object-cover max-h-40" />
        </div>
      )}
      <div>
        <label className="label">Vendor / Merchant</label>
        <ClearableInput
          inputClassName={inp}
          placeholder="e.g. Delta, Marriott…"
          value={form.vendor_name}
          onChange={e => setForm(f => ({ ...f, vendor_name: e.target.value }))}
          onClear={() => setForm(f => ({ ...f, vendor_name: "" }))}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Date</label>
          <input type="date" className={inp} value={form.transaction_date}
            onChange={e => setForm(f => ({ ...f, transaction_date: e.target.value }))} />
        </div>
        <div>
          <label className="label">Amount</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input className={`${inp} pl-6`} type="number" min="0" step="0.01" placeholder="0.00"
              value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          </div>
        </div>
      </div>
      <div>
        <label className="label">Currency</label>
        <div className="flex gap-2">
          {["USD", "CAD"].map(c => (
            <button key={c} onClick={() => setForm(f => ({ ...f, currency: c }))}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all
                ${form.currency === c
                  ? "bg-brand-navy text-white border-brand-navy"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Category</label>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map(cat => (
            <button key={cat.value} onClick={() => setForm(f => ({ ...f, category: cat.value }))}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all
                ${form.category === cat.value
                  ? "bg-brand-navy text-white border-brand-navy"
                  : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"}`}>
              <span>{cat.emoji}</span><span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
        <textarea className={`${inp} resize-none`} rows={2} placeholder="Any extra context…"
          value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      </div>
      {(source === "bank_transaction" || source === "bank_statement") && (
        <div className="px-4 py-3 rounded-2xl bg-yellow-50 border border-yellow-200">
          <p className="text-xs font-semibold text-yellow-700">
            📋 A Missing Receipt Form is required. You'll fill it in on the next step.
          </p>
        </div>
      )}
      {(() => {
        if (!form.transaction_date) return null;
        const days = Math.floor((Date.now() - new Date(form.transaction_date).getTime()) / 86_400_000);
        if (days < 61) return null;
        return (
          <div className="px-4 py-3 rounded-2xl" style={{ background: "#fef2f2", border: "1px solid rgba(239,68,68,0.35)" }}>
            <p className="text-xs font-bold text-red-600 mb-0.5">
              ⚠️ This receipt is {days} days old — it will be flagged as overdue
            </p>
            <p className="text-[11px] text-red-500">
              Receipts older than 60 days are sent directly to the Archive and cannot be added to a packet.
            </p>
          </div>
        );
      })()}
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
      <button onClick={saveReceipt}
        disabled={saving || !form.vendor_name || !form.amount}
        className={`w-full btn-primary ${(saving || !form.vendor_name || !form.amount) ? "opacity-50" : ""}`}>
        {saving ? "Saving…"
          : (source === "bank_transaction" || source === "bank_statement") ? "Continue →"
          : "Save Receipt"}
      </button>
    </div>
  );

  // ── MISSING FORM ──────────────────────────────────────────────────────
  const isBulk = source === "bank_statement" && bulkLines.length > 0;

  if (step === "missing-form") return (
    <div className="px-4 pt-2 md:pt-0 pb-8 space-y-5 md:max-w-lg md:mx-auto">
      {back(isBulk ? "bulk-review" : "form")}
      <div className="px-4 py-3 rounded-2xl bg-brand-navy/5 border border-brand-navy/10">
        <p className="text-xs font-bold text-brand-navy uppercase tracking-widest mb-0.5">Insight Global LLC</p>
        <p className="text-sm font-semibold text-gray-800">Missing Expense Receipt Form</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {isBulk
            ? `Applies to all ${bulkLines.length} selected statement expense${bulkLines.length !== 1 ? "s" : ""}`
            : source === "bank_statement"
              ? "Required for all bank statement submissions"
              : "Required for all bank transaction submissions"}
        </p>
      </div>

      {/* Bulk: summary table of all lines */}
      {isBulk ? (
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">
            Expenses from this statement
          </p>
          <div className="space-y-1.5">
            {bulkLines.map((l, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-gray-700 font-medium truncate max-w-[60%]">{l.form.vendor_name}</span>
                <span className="text-gray-500">${parseFloat(l.form.amount || "0").toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t border-gray-200 pt-1.5 flex items-center justify-between text-xs font-bold">
              <span className="text-gray-700">Total</span>
              <span style={{ color: "#00283C" }}>
                ${bulkLines.reduce((s, l) => s + parseFloat(l.form.amount || "0"), 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Single receipt: summary */
        <div className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Auto-filled from receipt</p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div><p className="text-gray-400 mb-0.5">Vendor</p><p className="font-semibold text-gray-800">{form.vendor_name || "—"}</p></div>
            <div><p className="text-gray-400 mb-0.5">Amount</p><p className="font-semibold text-gray-800">${parseFloat(form.amount || "0").toFixed(2)}</p></div>
            <div>
              <p className="text-gray-400 mb-0.5">Date</p>
              <p className="font-semibold text-gray-800">
                {new Date(form.transaction_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="label">Business Purpose for Expense <span className="text-red-400">*</span></label>
        <textarea className={`${inp} resize-none`} rows={3}
          placeholder="Describe the business reason for this expense…"
          value={mForm.business_purpose}
          onChange={e => setMForm(f => ({ ...f, business_purpose: e.target.value }))} />
      </div>
      <div>
        <label className="label">Reason for Missing Receipt <span className="text-red-400">*</span></label>
        <textarea className={`${inp} resize-none`} rows={3}
          placeholder={source === "bank_statement"
            ? "Bank statement provided as supporting documentation…"
            : "Explain why the original receipt is unavailable…"}
          value={mForm.reason}
          onChange={e => setMForm(f => ({ ...f, reason: e.target.value }))} />
      </div>
      <div>
        <label className="label">Electronic Signature — type your full name <span className="text-red-400">*</span></label>
        <input className={`${inp} italic`} placeholder="Your full name"
          value={mForm.signature}
          onChange={e => setMForm(f => ({ ...f, signature: e.target.value }))} />
        <p className="text-[10px] text-gray-400 mt-1">By typing your name you agree this serves as your electronic signature.</p>
      </div>

      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

      {/* Bulk save progress bar */}
      {saveProgress && (
        <div className="px-4 py-3 rounded-2xl border" style={{ background: "#f0fdfe", borderColor: "rgba(0,214,242,0.3)" }}>
          <p className="text-xs font-semibold" style={{ color: "#00283C" }}>
            Saving receipt {saveProgress.current} of {saveProgress.total}…
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-gray-200 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-300"
              style={{
                background: "#00D6F2",
                width: `${(saveProgress.current / saveProgress.total) * 100}%`,
              }} />
          </div>
        </div>
      )}

      <div className="flex gap-3">
        {!isBulk && (
          <button onClick={() => setStep("success")}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors">
            Skip for now
          </button>
        )}
        <button
          onClick={isBulk ? saveAllLines : saveMissingForm}
          disabled={saving || !mForm.business_purpose || !mForm.reason || !mForm.signature}
          className={`flex-1 btn-primary ${(saving || !mForm.business_purpose || !mForm.reason || !mForm.signature) ? "opacity-50" : ""}`}>
          {saving
            ? saveProgress ? `Saving ${saveProgress.current}/${saveProgress.total}…` : "Submitting…"
            : isBulk
              ? `Save ${bulkLines.length} Receipt${bulkLines.length !== 1 ? "s" : ""}`
              : "Submit Form"}
        </button>
      </div>
    </div>
  );

  // ── SUCCESS ───────────────────────────────────────────────────────────
  if (step === "success") return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-4 md:max-w-lg md:mx-auto">
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center
        ${isOverdue ? "bg-amber-50 border border-amber-200" : "bg-green-50 border border-green-200"}`}>
        {isOverdue ? (
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M14 9v6M14 18v.5" stroke="#d97706" strokeWidth="2.2" strokeLinecap="round"/>
            <path d="M12.3 4.3a2 2 0 013.4 0l9.6 16.4A2 2 0 0123.6 24H4.4a2 2 0 01-1.7-3.3L12.3 4.3z"
              stroke="#d97706" strokeWidth="1.8" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M8 14l4 4 8-8" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <div>
        <p className="text-lg font-bold text-gray-900">
          {savedCount > 1 ? `${savedCount} receipts saved!`
            : isOverdue ? "Receipt saved — action needed" : "Receipt saved!"}
        </p>
        <p className="text-sm text-gray-400 mt-1">
          {savedCount > 1
            ? `${savedCount} expenses highlighted on your statement and added to your packet.`
            : isOverdue ? "Your receipt has been added to your account."
            : source === "bank_statement"
              ? "Statement uploaded with highlighted transaction and form recorded."
              : source === "bank_transaction"
                ? "Your receipt and form have been recorded."
                : "Your receipt has been added to your account."}
        </p>
      </div>

      {/* Multi-save summary */}
      {savedCount > 1 && bulkLines.length > 0 && (
        <div className="w-full rounded-2xl border border-gray-100 bg-gray-50 p-4 text-left">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Saved expenses</p>
          <div className="space-y-1.5">
            {bulkLines.map((l, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-gray-700 truncate max-w-[60%]">{l.form.vendor_name}</span>
                <span className="font-semibold" style={{ color: "#00283C" }}>
                  ${parseFloat(l.form.amount || "0").toFixed(2)}
                </span>
              </div>
            ))}
            <div className="border-t border-gray-200 pt-1.5 flex justify-between text-xs font-bold">
              <span className="text-gray-700">Total</span>
              <span style={{ color: "#00283C" }}>
                ${bulkLines.reduce((s, l) => s + parseFloat(l.form.amount || "0"), 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {isOverdue && (
        <div className="w-full rounded-2xl px-4 py-3 text-left"
          style={{ background: "#fffbeb", border: "1px solid rgba(245,158,11,0.35)" }}>
          <p className="text-xs font-bold text-amber-700 mb-1">
            ⚠️ This receipt is overdue and has been sent to your Archive
          </p>
          <p className="text-[11px] text-amber-600">
            Because the transaction date is more than 60 days ago, it can't be added to a regular packet.
            Visit the Overdue Archive tab to fill in the expense details and export your form.
          </p>
        </div>
      )}

      <div className="flex gap-3 w-full max-w-xs">
        <button onClick={resetAll}
          className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
          Add Another
        </button>
        <button
          onClick={() => router.push(isOverdue ? "/archive" : "/packets")}
          className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
          style={isOverdue
            ? { background: "#dc2626", color: "#ffffff" }
            : { background: "#00283C", color: "#ffffff" }}>
          {isOverdue ? "Go to Archive" : "View Packets"}
        </button>
      </div>
    </div>
  );

  return null;
}
