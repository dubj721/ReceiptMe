"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { ALL_CITIES } from "@/lib/expense-schedule";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [city,    setCity]    = useState("");        // saved value
  const [search,  setSearch]  = useState("");        // text in the search input
  const [showList, setShowList] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState("");

  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: p } = await supabase
        .from("users").select("name, email, city").eq("id", user.id).single();
      if (p) {
        setName(p.name ?? "");
        setEmail(p.email ?? user.email ?? "");
        setCity(p.city ?? "");
        setSearch(p.city ?? "");
      }
      setLoading(false);
    }
    load();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowList(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function save() {
    setSaving(true); setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error: err } = await supabase
        .from("users").update({ name, city: city || null }).eq("id", user.id);
      if (err) throw err;
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function selectCity(c: string) {
    setCity(c);
    setSearch(c);
    setShowList(false);
  }

  function clearCity() {
    setCity("");
    setSearch("");
  }

  const filtered = search.trim()
    ? ALL_CITIES.filter(c => c.toLowerCase().includes(search.toLowerCase()))
    : ALL_CITIES;

  const initials = name
    ? name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full px-4 pt-4 pb-10" style={{ boxSizing: "border-box" }}>

      {/* ── Page title ───────────────────────────────────────────────────── */}
      <p className="text-base font-bold text-white mb-5">Account Settings</p>

      {/* ── Profile card ─────────────────────────────────────────────────── */}
      <div
        className="w-full rounded-2xl p-5 mb-4"
        style={{
          background: "linear-gradient(135deg, rgba(10,44,68,0.95) 0%, rgba(16,62,92,0.9) 100%)",
          border: "1px solid rgba(0,214,242,0.15)",
          boxSizing: "border-box",
        }}>

        {/* Avatar + info row */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #005070 0%, #007fa0 100%)",
              border: "2px solid rgba(0,214,242,0.4)",
            }}>
            <span className="text-white text-sm font-bold">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{name || "—"}</p>
            <p className="text-[11px] truncate" style={{ color: "rgba(255,255,255,0.45)" }}>{email}</p>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", marginBottom: 20 }} />

        {/* Name field */}
        <div className="mb-4">
          <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1.5"
            style={{ color: "rgba(255,255,255,0.4)" }}>
            Display Name
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-colors"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(0,214,242,0.2)",
              color: "white",
              boxSizing: "border-box",
            }}
            placeholder="Your name"
          />
        </div>

        {/* Email — read only */}
        <div className="mb-4">
          <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1.5"
            style={{ color: "rgba(255,255,255,0.4)" }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full px-4 py-2.5 rounded-xl text-sm cursor-not-allowed"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.35)",
              boxSizing: "border-box",
            }}
          />
          <p className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
            Email cannot be changed here.
          </p>
        </div>

        {/* ── Office City picker ──────────────────────────────────────────── */}
        <div className="mb-5" ref={searchRef}>
          <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1.5"
            style={{ color: "rgba(255,255,255,0.4)" }}>
            Office City
          </label>

          {/* Selected pill OR search input */}
          {city ? (
            <div className="flex items-center gap-2">
              <div
                className="flex-1 min-w-0 flex items-center gap-2 px-4 py-2.5 rounded-xl"
                style={{
                  background: "rgba(0,214,242,0.12)",
                  border: "1px solid rgba(0,214,242,0.35)",
                }}>
                <span className="text-[11px]">📍</span>
                <span className="text-sm font-semibold truncate" style={{ color: "#00D6F2" }}>
                  {city}
                </span>
              </div>
              <button
                onClick={clearCity}
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}>
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M2 2l8 8M10 2L2 10" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          ) : (
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setShowList(true); }}
              onFocus={() => setShowList(true)}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-colors"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(0,214,242,0.2)",
                color: "white",
                boxSizing: "border-box",
              }}
              placeholder="Search office city…"
            />
          )}

          {/* Dropdown list */}
          {showList && !city && (
            <div
              className="w-full mt-1 rounded-2xl overflow-hidden"
              style={{
                background: "rgba(8,28,44,0.98)",
                border: "1px solid rgba(0,214,242,0.2)",
                maxHeight: 220,
                overflowY: "auto",
              }}>
              {filtered.length === 0 ? (
                <p className="px-4 py-3 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                  No cities found
                </p>
              ) : (
                filtered.map(c => (
                  <button
                    key={c}
                    onClick={() => selectCity(c)}
                    className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                    style={{ color: "rgba(255,255,255,0.8)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,214,242,0.1)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    {c}
                  </button>
                ))
              )}
            </div>
          )}

          <p className="text-[10px] mt-1.5" style={{ color: "rgba(255,255,255,0.28)" }}>
            Used to calculate your expense submission deadline.
          </p>
        </div>

        {error && (
          <p className="text-xs text-red-400 mb-3">{error}</p>
        )}

        <button
          onClick={save}
          disabled={saving || !name.trim()}
          className="w-full py-2.5 rounded-xl text-sm font-bold transition-opacity disabled:opacity-40"
          style={{ background: "#00D6F2", color: "#00283C" }}>
          {saved ? "Saved ✓" : saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {/* ── Sign out ──────────────────────────────────────────────────────── */}
      <button
        onClick={signOut}
        className="w-full py-2.5 rounded-xl text-sm font-medium transition-colors active:scale-[0.99]"
        style={{
          background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.2)",
          color: "#f87171",
          boxSizing: "border-box",
        }}>
        Sign Out
      </button>

    </div>
  );
}
