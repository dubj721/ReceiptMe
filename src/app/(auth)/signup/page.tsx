"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Country } from "@/types";
import ClearableInput from "@/components/ui/ClearableInput";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry]   = useState<Country>("US");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, country },          // stored in auth.users raw_user_meta_data
        emailRedirectTo: `${location.origin}/api/auth/callback`,
      },
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
      return;
    }

    // Insert profile row into public.users.
    // The DB trigger (on auth.users INSERT) is the primary safety net —
    // this client-side insert is a belt-and-suspenders fallback.
    // upsert avoids a duplicate-key error if the trigger already ran.
    if (data.user) {
      const { error: profileError } = await supabase.from("users").upsert(
        { id: data.user.id, email, name, country },
        { onConflict: "id", ignoreDuplicates: true }
      );
      if (profileError) {
        // Non-fatal — the trigger will have created the row. Log and continue.
        console.warn("Profile upsert warning:", profileError.message);
      }
    }

    // If email confirmation is required, data.session will be null.
    // Show a "check your email" message instead of redirecting into the app.
    if (!data.session) {
      setError(null);
      setLoading(false);
      router.push("/login?confirm=1");
      return;
    }

    router.push("/home");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-brand-navy flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        <div className="w-full max-w-sm">
          <div className="mb-10 text-center">
            <p className="text-brand-cyan text-xs font-bold uppercase tracking-widest mb-2">
              Insight Global
            </p>
            <h1 className="text-white text-3xl font-bold">Create account</h1>
            <p className="text-white/40 text-sm mt-2">Set up your receipt manager</p>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="label" htmlFor="name">Full name</label>
                <ClearableInput
                  id="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onClear={() => setName("")}
                  placeholder="Jordan Gold"
                  inputClassName="input"
                />
              </div>

              <div>
                <label className="label" htmlFor="email">Work email</label>
                <ClearableInput
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onClear={() => setEmail("")}
                  placeholder="you@insightglobal.com"
                  inputClassName="input"
                />
              </div>

              <div>
                <label className="label" htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="input"
                />
              </div>

              {/* Country selector — controls 60-day policy */}
              <div>
                <label className="label">Your work location</label>
                <p className="text-[11px] text-gray-400 mb-2">
                  This determines which expense policy applies to you.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(["US", "CA"] as Country[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCountry(c)}
                      className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                        country === c
                          ? "border-brand-navy bg-brand-navy text-white"
                          : "border-gray-200 bg-gray-50 text-gray-600"
                      }`}
                    >
                      {c === "US" ? "🇺🇸  United States" : "🇨🇦  Canada"}
                    </button>
                  ))}
                </div>
                {country === "CA" && (
                  <p className="text-[11px] text-gray-400 mt-2">
                    Canadian employees are exempt from the 60-day receipt submission policy.
                  </p>
                )}
              </div>

              {error && (
                <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <button type="submit" disabled={loading} className="btn-primary mt-2">
                {loading ? "Creating account…" : "Create account"}
              </button>
            </form>
          </div>

          <p className="text-center text-white/40 text-sm mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-brand-cyan font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
