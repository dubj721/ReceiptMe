"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ReceiptCategory } from "@/types";

type Source = "photo" | "bank_transaction" | "manual";
type Step   = "source" | "upload" | "processing" | "form" | "missing-form" | "success";

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

function UploadZone({ preview, onFile }: { preview: string | null; onFile: (f: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <button onClick={() => inputRef.current?.click()}
      className="w-full rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50
                 flex flex-col items-center justify-center gap-2 transition-colors
                 hover:border-brand-cyan hover:bg-brand-cyan/5"
      style={{ minHeight: 200 }}>
      {preview ? (
        <img src={preview} alt="Receipt preview"
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
          <p className="text-sm font-medium text-gray-500">Tap to upload image</p>
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

  const handleFile = useCallback((file: File) => {
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  }, []);

  // Resize + compress image to stay under OCR.space 1MB free-tier limit
  async function compressImage(file: File): Promise<{ b64: string; mime: string }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX = 1200; // max dimension in px
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
        resolve({ b64: dataUrl.split(",")[1], mime: "image/jpeg" });
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  async function processImage() {
    if (!imageFile) { setStep("form"); return; }
    setStep("processing");
    try {
      const { b64, mime } = await compressImage(imageFile);
      const resp = await fetch("/api/receipts/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_b64: b64, mime_type: mime }),
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount), source, image_url }),
      });
      if (!resp.ok) throw new Error(await resp.text());
      const { id } = await resp.json();
      setReceiptId(id);
      setStep(source === "bank_transaction" ? "missing-form" : "success");
    } catch (e: any) {
      setError(e.message ?? "Something went wrong.");
    } finally { setSaving(false); }
  }

  async function saveMissingForm() {
    if (!receiptId) return;
    setSaving(true); setError(null);
    try {
      const resp = await fetch(`/api/missing-forms/${receiptId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...mForm, completed_at: new Date().toISOString() }),
      });
      if (!resp.ok) throw new Error(await resp.text());
      setStep("success");
    } catch (e: any) {
      setError(e.message ?? "Something went wrong.");
    } finally { setSaving(false); }
  }

  const inp = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-brand-cyan transition-colors";
  const back = (to: Step) => (
    <button onClick={() => setStep(to)}
      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-1">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      Back
    </button>
  );

  if (step === "source") return (
    <div className="px-4 pt-2 md:pt-0 pb-8 space-y-3">
      <SourceCard icon="📷" title="Photo Receipt" subtitle="Photograph a paper receipt"
        onClick={() => { setSource("photo"); setStep("upload"); }} />
      <SourceCard icon="🏦" title="Bank Transaction" subtitle="Screenshot from your bank — form required"
        onClick={() => { setSource("bank_transaction"); setStep("upload"); }} />
      <SourceCard icon="✍️" title="Manual Entry" subtitle="Type receipt details by hand"
        onClick={() => { setSource("manual"); setStep("form"); }} />
      <SourceCard icon="📧" title="Email Forward" subtitle="Forward a receipt email to your inbox" disabled />
      <SourceCard icon="↗️" title="Concur Import" subtitle="Pull invoices from your Concur account" disabled />
    </div>
  );

  if (step === "upload") return (
    <div className="px-4 pt-2 md:pt-0 pb-8 space-y-4">
      {back("source")}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          {source === "photo" ? "Photo Receipt" : "Bank Transaction Screenshot"}
        </p>
        <UploadZone preview={preview} onFile={handleFile} />
      </div>
      <button onClick={imageFile ? processImage : () => setStep("form")} className="w-full btn-primary">
        {imageFile ? "Read Receipt →" : "Skip, enter manually →"}
      </button>
    </div>
  );

  if (step === "processing") return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-brand-cyan/10 flex items-center justify-center animate-pulse">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M3 9V5a2 2 0 012-2h4M15 3h4a2 2 0 012 2v4M21 15v4a2 2 0 01-2 2h-4M9 21H5a2 2 0 01-2-2v-4"
            stroke="#00D6F2" strokeWidth="1.8" strokeLinecap="round"/>
          <circle cx="12" cy="12" r="3" stroke="#00D6F2" strokeWidth="1.5"/>
        </svg>
      </div>
      <p className="text-sm font-semibold text-gray-700">Reading your receipt…</p>
      <p className="text-xs text-gray-400">This only takes a second</p>
    </div>
  );

  if (step === "form") return (
    <div className="px-4 pt-2 md:pt-0 pb-8 space-y-5">
      {source !== "manual" && back("upload")}
      {preview && (
        <div className="w-full rounded-2xl overflow-hidden border border-gray-100 max-h-40">
          <img src={preview} alt="Receipt" className="w-full object-cover max-h-40" />
        </div>
      )}
      <div>
        <label className="label">Vendor / Merchant</label>
        <input className={inp} placeholder="e.g. Delta, Marriott…" value={form.vendor_name}
          onChange={e => setForm(f => ({ ...f, vendor_name: e.target.value }))} />
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
      {source === "bank_transaction" && (
        <div className="px-4 py-3 rounded-2xl bg-yellow-50 border border-yellow-200">
          <p className="text-xs font-semibold text-yellow-700">
            📋 A Missing Receipt Form is required for bank transactions. You'll fill it in on the next step.
          </p>
        </div>
      )}
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
      <button onClick={saveReceipt}
        disabled={saving || !form.vendor_name || !form.amount}
        className={`w-full btn-primary ${(saving || !form.vendor_name || !form.amount) ? "opacity-50" : ""}`}>
        {saving ? "Saving…" : source === "bank_transaction" ? "Continue →" : "Save Receipt"}
      </button>
    </div>
  );

  if (step === "missing-form") return (
    <div className="px-4 pt-2 md:pt-0 pb-8 space-y-5">
      <div className="px-4 py-3 rounded-2xl bg-brand-navy/5 border border-brand-navy/10">
        <p className="text-xs font-bold text-brand-navy uppercase tracking-widest mb-0.5">Insight Global LLC</p>
        <p className="text-sm font-semibold text-gray-800">Missing Expense Receipt Form</p>
        <p className="text-xs text-gray-500 mt-0.5">Required for all bank transaction submissions</p>
      </div>
      <div className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Auto-filled from receipt</p>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div><p className="text-gray-400 mb-0.5">Vendor</p><p className="font-semibold text-gray-800">{form.vendor_name || "—"}</p></div>
          <div><p className="text-gray-400 mb-0.5">Amount</p><p className="font-semibold text-gray-800">${parseFloat(form.amount || "0").toFixed(2)}</p></div>
          <div><p className="text-gray-400 mb-0.5">Date</p>
            <p className="font-semibold text-gray-800">
              {new Date(form.transaction_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>
      </div>
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
          placeholder="Explain why the original receipt is unavailable…"
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
      <div className="flex gap-3">
        <button onClick={() => setStep("success")}
          className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors">
          Skip for now
        </button>
        <button onClick={saveMissingForm}
          disabled={saving || !mForm.business_purpose || !mForm.reason || !mForm.signature}
          className={`flex-1 btn-primary ${(saving || !mForm.business_purpose || !mForm.reason || !mForm.signature) ? "opacity-50" : ""}`}>
          {saving ? "Submitting…" : "Submit Form"}
        </button>
      </div>
    </div>
  );

  if (step === "success") return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-green-50 border border-green-200 flex items-center justify-center">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M8 14l4 4 8-8" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div>
        <p className="text-lg font-bold text-gray-900">Receipt saved!</p>
        <p className="text-sm text-gray-400 mt-1">
          {source === "bank_transaction"
            ? "Your receipt and form have been recorded."
            : "Your receipt has been added to your account."}
        </p>
      </div>
      <div className="flex gap-3 w-full max-w-xs">
        <button onClick={() => {
          setStep("source"); setForm(EMPTY); setPreview(null);
          setImageFile(null); setMForm({ business_purpose: "", reason: "", signature: "" });
          setReceiptId(null); setError(null);
        }} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
          Add Another
        </button>
        <button onClick={() => router.push("/packets")} className="flex-1 btn-primary">View Packets</button>
      </div>
    </div>
  );

  return null;
}
