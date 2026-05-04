"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: profile } = await supabase
        .from("users").select("name, email").eq("id", user.id).single();
      if (profile) {
        setName(profile.name ?? "");
        setEmail(profile.email ?? user.email ?? "");
      }
      setLoading(false);
    }
    load();
  }, []);

  async function save() {
    setSaving(true);
    setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error: err } = await supabase
        .from("users").update({ name }).eq("id", user.id);
      if (err) throw err;
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Account Settings</h1>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">

        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-brand-cyan/20 flex items-center justify-center flex-shrink-0">
            <span className="text-brand-navy text-xl font-bold">
              {name?.charAt(0).toUpperCase() || "?"}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{name || "—"}</p>
            <p className="text-xs text-gray-400">{email}</p>
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* Name field */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Display Name
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50
              text-sm text-gray-900 outline-none focus:border-brand-cyan transition-colors"
            placeholder="Your name"
          />
        </div>

        {/* Email — read only */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-100
              text-sm text-gray-400 cursor-not-allowed"
          />
          <p className="text-[10px] text-gray-400 mt-1">Email cannot be changed here.</p>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          onClick={save}
          disabled={saving || !name.trim()}
          className="w-full py-2.5 rounded-xl bg-brand-navy text-brand-cyan text-sm font-bold
            hover:opacity-90 transition-opacity disabled:opacity-40">
          {saved ? "Saved ✓" : saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Sign out */}
      <div className="mt-4">
        <button
          onClick={signOut}
          className="w-full py-2.5 rounded-xl border border-gray-200 bg-white
            text-sm text-red-500 font-medium hover:bg-red-50 transition-colors">
          Sign Out
        </button>
      </div>
    </div>
  );
}
