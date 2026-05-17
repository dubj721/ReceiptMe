"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const supabase     = createClient();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  // Shown when signup redirects here after email-confirmation flow
  const needsConfirm = searchParams.get("confirm") === "1";

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/home");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-brand-navy flex flex-col">
      {/* Header */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        <div className="w-full max-w-sm">
          {/* Logo area */}
          <div className="mb-10 text-center">
            <p className="text-brand-cyan text-xs font-bold uppercase tracking-widest mb-2">
              Insight Global
            </p>
            <h1 className="text-white text-3xl font-bold">Receipt Manager</h1>
            <p className="text-white/40 text-sm mt-2">Sign in to your account</p>
          </div>

          {/* Email confirmation notice */}
          {needsConfirm && (
            <div className="mb-4 px-4 py-3 rounded-2xl text-sm text-center"
              style={{ background: "rgba(0,214,242,0.12)", border: "1px solid rgba(0,214,242,0.3)", color: "#00D6F2" }}>
              <p className="font-semibold mb-0.5">Check your email</p>
              <p className="text-xs opacity-80">We sent a confirmation link. Click it, then sign in here.</p>
            </div>
          )}

          {/* Form card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="label" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@insightglobal.com"
                  className="input"
                />
              </div>

              <div>
                <label className="label" htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input"
                />
              </div>

              {error && (
                <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <button type="submit" disabled={loading} className="btn-primary mt-2">
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </div>

          <p className="text-center text-white/40 text-sm mt-6">
            New employee?{" "}
            <Link href="/signup" className="text-brand-cyan font-medium">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
