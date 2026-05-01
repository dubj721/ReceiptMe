"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Photo = { id: string; dataUrl: string; blob: Blob };
type Phase = "camera" | "preview" | "processing" | "success";

// genId() requires HTTPS — use a safe fallback for local HTTP
function genId(): string {
  try { return genId(); } catch {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }
}

export default function BatchCapture({ onClose }: { onClose: () => void }) {
  const router       = useRouter();
  const videoRef     = useRef<HTMLVideoElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const streamRef    = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [phase,        setPhase]        = useState<Phase>("camera");
  const [photos,       setPhotos]       = useState<Photo[]>([]);
  const [preview,      setPreview]      = useState<{ dataUrl: string; blob: Blob } | null>(null);
  const [processed,    setProcessed]    = useState(0);
  const [flash,        setFlash]        = useState(false);
  const [useFileInput, setUseFileInput] = useState(false);
  const [camReady,     setCamReady]     = useState(false);
  // Signals that the file input should auto-open once useFileInput is confirmed
  const pendingAutoOpen = useRef(false);

  useEffect(() => {
    const secure = typeof window !== "undefined" && window.isSecureContext;
    const hasGUM = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

    if (!secure || !hasGUM) {
      pendingAutoOpen.current = true;
      setUseFileInput(true);
    } else {
      startWebcam();
    }
  }, []);

  // Auto-open the native camera as soon as file input mode is confirmed
  useEffect(() => {
    if (useFileInput && pendingAutoOpen.current) {
      pendingAutoOpen.current = false;
      // Small delay lets the component fully render before iOS opens the camera sheet
      const t = setTimeout(() => fileInputRef.current?.click(), 150);
      return () => clearTimeout(t);
    }
  }, [useFileInput]);

  async function startWebcam() {
    const attempts: MediaStreamConstraints[] = [
      { video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false },
      { video: { facingMode: { ideal: "environment" } }, audio: false },
      { video: true, audio: false },
    ];

    for (const constraints of attempts) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCamReady(true);
        }
        return;
      } catch (err: any) {
        if (err?.name === "NotAllowedError") break;
      }
    }
    // WebRTC failed — fall back to file input (handles desktop permission denial too)
    setUseFileInput(true);
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }

  // ── WebRTC capture (desktop / HTTPS) ──
  const captureFrame = useCallback(() => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c || v.readyState < 2) return;

    setFlash(true);
    setTimeout(() => setFlash(false), 120);

    c.width  = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);

    const dataUrl = c.toDataURL("image/jpeg", 0.92);
    c.toBlob(blob => {
      if (blob) { setPreview({ dataUrl, blob }); setPhase("preview"); }
    }, "image/jpeg", 0.92);
  }, []);

  // ── File input capture (iOS / HTTP) ──
  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset so same photo can be retaken
    e.target.value = "";

    const reader = new FileReader();
    reader.onload = () => {
      setPreview({ dataUrl: reader.result as string, blob: file });
      setPhase("preview");
    };
    reader.readAsDataURL(file);
  }

  function triggerCapture() {
    if (useFileInput) {
      fileInputRef.current?.click();
    } else {
      captureFrame();
    }
  }

  function keepPhoto() {
    if (!preview) return;
    setPhotos(prev => [...prev, { id: genId(), dataUrl: preview.dataUrl, blob: preview.blob }]);
    setPreview(null);
    setPhase("camera");
    // On iOS file-input mode: re-open the native camera immediately.
    // This works because we're inside a synchronous user-gesture handler (button tap).
    if (useFileInput) {
      fileInputRef.current?.click();
    }
  }

  function retake() {
    setPreview(null);
    setPhase("camera");
    // On iOS, re-opening the camera picker happens when shutter is tapped again
  }

  async function compressDataUrl(dataUrl: string): Promise<{ b64: string; mime: string }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1200;
        let w = img.naturalWidth, h = img.naturalHeight;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h / w * MAX); w = MAX; }
          else       { w = Math.round(w / h * MAX); h = MAX; }
        }
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        c.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve({ b64: c.toDataURL("image/jpeg", 0.85).split(",")[1], mime: "image/jpeg" });
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  async function processAndSave(photoList: Photo[]) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    for (const photo of photoList) {
      try {
        const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("receipts")
          .upload(path, photo.blob, { contentType: "image/jpeg", cacheControl: "3600", upsert: false });
        const image_url = upErr
          ? null
          : supabase.storage.from("receipts").getPublicUrl(path).data.publicUrl;

        let ocrData: any = {};
        try {
          const { b64, mime } = await compressDataUrl(photo.dataUrl);
          const res = await fetch("/api/receipts/ocr", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image_b64: b64, mime_type: mime }),
          });
          if (res.ok) ocrData = await res.json();
        } catch { /* OCR failed — use defaults */ }

        await fetch("/api/receipts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vendor_name:      ocrData.vendor_name      || "Unknown Vendor",
            amount:           parseFloat(ocrData.amount) || 0,
            transaction_date: ocrData.transaction_date || new Date().toISOString().split("T")[0],
            category:         ocrData.category         || "other",
            currency:         "USD",
            source:           "photo",
            notes:            "",
            image_url,
          }),
        });
      } catch { /* continue */ }

      setProcessed(p => p + 1);
    }
  }

  async function handleDone() {
    if (photos.length === 0) { onClose(); return; }
    setPhase("processing");
    stopCamera();
    await processAndSave(photos);
    setPhase("success");
  }

  /* ── Success ── */
  if (phase === "success") return (
    <div className="fixed inset-0 z-[100] bg-brand-navy flex flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="w-20 h-20 rounded-3xl bg-white/10 border border-white/20 flex items-center justify-center">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <path d="M8 18l7 7 13-13" stroke="#00D6F2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div>
        <p className="text-2xl font-bold text-white">
          {photos.length} receipt{photos.length !== 1 ? "s" : ""} added
        </p>
        <p className="text-sm text-white/50 mt-1">OCR'd and filed to this month's packet</p>
      </div>
      <div className="flex gap-3 w-full max-w-xs mt-2">
        <button onClick={onClose}
          className="flex-1 py-3.5 rounded-xl bg-white/10 text-white text-sm font-semibold">
          Close
        </button>
        <button onClick={() => { onClose(); router.push("/packets"); }}
          className="flex-1 py-3.5 rounded-xl bg-brand-cyan text-brand-navy text-sm font-bold">
          View Packet
        </button>
      </div>
    </div>
  );

  /* ── Processing ── */
  if (phase === "processing") return (
    <div className="fixed inset-0 z-[100] bg-brand-navy flex flex-col items-center justify-center gap-5 px-6">
      <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center animate-pulse">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="5" stroke="#00D6F2" strokeWidth="1.8"/>
          <path d="M4 10a10 10 0 0110-8M24 18a10 10 0 01-10 8"
            stroke="#00D6F2" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </div>
      <div className="text-center">
        <p className="text-white font-bold text-lg">Processing receipts…</p>
        <p className="text-white/50 text-sm mt-1">{processed} of {photos.length} done</p>
      </div>
      <div className="w-full max-w-xs bg-white/10 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full bg-brand-cyan rounded-full transition-all duration-300"
          style={{ width: `${photos.length > 0 ? (processed / photos.length) * 100 : 0}%` }}
        />
      </div>
      <p className="text-white/30 text-xs">OCR'ing and filing to your packet</p>
    </div>
  );

  /* ── Camera / Preview ── */
  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col overflow-hidden">
      {/* Hidden elements */}
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileInput}
      />

      {/* Flash overlay (WebRTC only) */}
      {flash && (
        <div className="absolute inset-0 z-10 bg-white pointer-events-none"
          style={{ opacity: 0.65 }} />
      )}

      {/* ── Viewfinder area ── */}
      {useFileInput ? (
        /* iOS / file input mode — show a styled dark background with guidance */
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4"
          style={{ background: "radial-gradient(ellipse at center, #0f2030 0%, #000 70%)" }}>
          {phase === "camera" && (
            <>
              {/* Viewfinder frame */}
              <div className="w-64 h-80 rounded-3xl border-2 border-white/20 flex flex-col items-center justify-center gap-3 relative">
                <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-brand-cyan rounded-tl-lg" />
                <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-brand-cyan rounded-tr-lg" />
                <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-brand-cyan rounded-bl-lg" />
                <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-brand-cyan rounded-br-lg" />
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="opacity-30">
                  <path d="M5 14a4 4 0 014-4h2.5l2.5-4h12l2.5 4H31a4 4 0 014 4v16a4 4 0 01-4 4H9a4 4 0 01-4-4V14z"
                    stroke="white" strokeWidth="2" strokeLinejoin="round"/>
                  <circle cx="20" cy="21" r="5.5" stroke="white" strokeWidth="2"/>
                </svg>
                <p className="text-white/40 text-xs text-center px-6">
                  Opening camera… tap shutter if it doesn't open
                </p>
              </div>
            </>
          )}
        </div>
      ) : (
        /* WebRTC live viewfinder */
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: phase === "preview" ? 0 : 1 }}
        />
      )}

      {/* Captured preview (both modes) */}
      {phase === "preview" && preview && (
        <img
          src={preview.dataUrl}
          alt="Preview"
          className="absolute inset-0 w-full h-full object-contain bg-black"
        />
      )}

      {/* ── Top bar ── */}
      <div className="relative z-20 flex items-center justify-between px-5 pt-14 pb-4">
        <button onClick={onClose}
          className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M1.5 1.5l10 10M11.5 1.5l-10 10" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>

        {photos.length > 0 && phase === "camera" && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse" />
            <span className="text-white text-xs font-semibold">{photos.length} captured</span>
          </div>
        )}

        {phase === "preview" && (
          <p className="text-white/70 text-xs font-medium">Keep this photo?</p>
        )}
      </div>

      {/* ── Bottom controls ── */}
      <div className="relative z-20 mt-auto pb-14 pt-4 px-6">

        {/* Thumbnail strip */}
        {photos.length > 0 && phase === "camera" && (
          <div className="flex gap-2 mb-6 justify-center">
            {photos.slice(-5).map((p, i) => (
              <div key={p.id} className="relative">
                <img src={p.dataUrl} alt=""
                  className="w-12 h-14 object-cover rounded-lg border-2 border-white/40" />
                {i === photos.slice(-5).length - 1 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand-cyan
                    flex items-center justify-center text-[8px] font-bold text-brand-navy">
                    {photos.length}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Shutter row */}
        {phase === "camera" && (
          <div className="flex items-center justify-between">
            <div className="w-20 flex justify-start">
              {photos.length > 0 ? (
                <button onClick={handleDone}
                  className="px-4 py-2.5 rounded-xl bg-brand-cyan text-brand-navy text-xs font-bold shadow-lg">
                  Done ({photos.length})
                </button>
              ) : (
                <button onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-white/10 text-white text-xs font-medium">
                  Cancel
                </button>
              )}
            </div>

            {/* Shutter button — triggers file input on iOS, canvas capture on desktop */}
            <button
              onClick={triggerCapture}
              className="w-[72px] h-[72px] rounded-full border-[3px] border-white/60 bg-transparent
                flex items-center justify-center active:scale-95 transition-transform"
              aria-label="Take photo">
              <div className="w-[58px] h-[58px] rounded-full bg-white shadow-inner" />
            </button>

            <div className="w-20" />
          </div>
        )}

        {/* Preview controls */}
        {phase === "preview" && (
          <div className="flex gap-3">
            <button onClick={retake}
              className="flex-1 py-4 rounded-2xl bg-black/50 backdrop-blur-sm border border-white/20
                text-white font-semibold text-sm active:scale-[0.98] transition-transform">
              ↩ Retake
            </button>
            <button onClick={keepPhoto}
              className="flex-1 py-4 rounded-2xl bg-brand-cyan text-brand-navy font-bold text-sm
                active:scale-[0.98] transition-transform shadow-lg">
              ✓ Keep
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
