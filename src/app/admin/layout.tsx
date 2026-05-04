import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Reading own row — covered by users_read_own_profile policy
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile?.is_admin) redirect("/home");

  return (
    <div className="h-screen overflow-hidden bg-gray-100 flex flex-col">
      <div className="flex-shrink-0 bg-brand-navy px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-brand-cyan text-[10px] font-bold uppercase tracking-widest">Admin</p>
            <p className="text-white text-lg font-bold leading-tight">Insight Global</p>
          </div>
          <nav className="hidden md:flex items-center gap-1 ml-6">
            {[
              { href: "/admin",          label: "Overview" },
              { href: "/admin/users",    label: "Users" },
              { href: "/admin/feedback", label: "Feedback" },
            ].map(({ href, label }) => (
              <Link key={href} href={href}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <Link href="/home"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-cyan text-brand-navy text-xs font-bold hover:opacity-90 transition-opacity">
          ← User View
        </Link>
      </div>

      <div className="flex-shrink-0 md:hidden bg-brand-navy/90 border-t border-white/10 flex">
        {[
          { href: "/admin",          label: "Overview" },
          { href: "/admin/users",    label: "Users" },
          { href: "/admin/feedback", label: "Feedback" },
        ].map(({ href, label }) => (
          <Link key={href} href={href}
            className="flex-1 py-2.5 text-center text-xs font-medium text-white/70 hover:text-white transition-colors">
            {label}
          </Link>
        ))}
      </div>

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
