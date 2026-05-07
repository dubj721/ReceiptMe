import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminNav from "@/components/admin/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile?.is_admin) redirect("/home");

  return (
    <div
      className="h-screen overflow-hidden flex"
      style={{
        height: "100dvh",
        background: "linear-gradient(140deg, #020c15 0%, #041828 55%, #071e30 100%)",
      }}>

      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <div className="hidden md:flex md:w-56 md:flex-shrink-0 border-r"
        style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <AdminNav variant="sidebar" />
      </div>

      {/* ── Main column ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">

        {/* Mobile top bar */}
        <div
          className="md:hidden flex-shrink-0 flex items-center justify-between px-4"
          style={{
            paddingTop: "max(14px, env(safe-area-inset-top, 14px))",
            paddingBottom: 12,
            background: "rgba(2,12,21,0.97)",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#00D6F2" }}>Admin</p>
            <p className="text-white text-base font-bold leading-tight">Insight Global</p>
          </div>
          <Link
            href="/home"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-opacity hover:opacity-80"
            style={{ background: "rgba(0,214,242,0.15)", color: "#00D6F2", border: "1px solid rgba(0,214,242,0.3)" }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7l5 5" stroke="#00D6F2" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            User View
          </Link>
        </div>

        {/* Mobile tab strip */}
        <div className="md:hidden flex-shrink-0">
          <AdminNav variant="tabs" />
        </div>

        {/* Desktop page header bar */}
        <div
          className="hidden md:flex flex-shrink-0 items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "#00D6F2" }}>Admin</p>
            <p className="text-white text-sm font-semibold">Insight Global — Receipt Manager</p>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
