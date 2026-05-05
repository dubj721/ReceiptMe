import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import BottomNav from "@/components/ui/BottomNav";
import Sidebar from "@/components/ui/Sidebar";
import TopBar from "@/components/ui/TopBar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch user profile
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div
      className="h-screen overflow-hidden flex"
      style={{
        height: "100dvh",
        background: "linear-gradient(140deg, #00283C 0%, #003d5c 55%, #00506e 100%)",
      }}>
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:flex md:w-56 md:flex-shrink-0">
        <Sidebar profile={profile} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex-shrink-0">
          <TopBar profile={profile} />
        </div>

        <main className="scroll-area flex-1 min-h-0 pb-24 md:pb-6 md:px-6 md:py-6">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40">
          <BottomNav />
        </div>


      </div>
    </div>
  );
}
