import { createClient } from "@/lib/supabase/server";
import type { Receipt, User } from "@/types";
import Link from "next/link";
import ArchiveForm from "@/components/archive/ArchiveForm";

export default async function ArchivePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users").select("*").eq("id", user.id).single();

  const { data: receipts } = await supabase
    .from("receipts")
    .select("*, missing_receipt_form:missing_receipt_forms(*)")
    .eq("user_id", user.id)
    .in("status", ["overdue_flagged", "archived"])
    .order("transaction_date", { ascending: false });

  const country       = (profile as User)?.country ?? "US";
  const userName      = (profile as any)?.name      ?? "Employee";
  const userOffice    = (profile as any)?.city       ?? "";
  const typedList     = (receipts as Receipt[])     ?? [];

  return (
    <div className="px-4 pt-2 md:pt-0 pb-8 md:max-w-2xl md:mx-auto">

      {/* CA exemption notice */}
      {country === "CA" && (
        <div className="mb-4 px-4 py-3 rounded-2xl bg-blue-50 border border-blue-200">
          <p className="text-xs font-semibold text-blue-700">
            ℹ️ The 60-day policy does not apply to Canadian employees. This archive will always be empty.
          </p>
        </div>
      )}

      {/* Empty state */}
      {typedList.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-2xl mb-3">✅</p>
          <p className="text-gray-500 text-sm font-medium">No overdue receipts</p>
          <p className="text-gray-400 text-xs mt-1">
            {country === "CA"
              ? "Policy not applicable for your region."
              : "All your receipts are within the 60-day window."}
          </p>
          <Link href="/capture" className="mt-6 btn-primary max-w-[160px]">
            Add Receipt
          </Link>
        </div>
      )}

      {/* In-app expense form */}
      {typedList.length > 0 && (
        <>
          {/* Summary banner */}
          <div
            className="mb-5 px-4 py-3 rounded-2xl"
            style={{ background: "#fef2f2", border: "1px solid rgba(239,68,68,0.25)" }}>
            <p className="text-xs font-bold text-red-700 mb-0.5">
              {typedList.length} overdue receipt{typedList.length > 1 ? "s" : ""} — fill in context below, then export
            </p>
            <p className="text-[11px] text-red-500">
              Select an expense category for each receipt. Other fields are optional but help with approval.
            </p>
          </div>

          <ArchiveForm
            receipts={typedList}
            userId={user.id}
            defaultName={userName}
            defaultOffice={userOffice}
          />
        </>
      )}
    </div>
  );
}
