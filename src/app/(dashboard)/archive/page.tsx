import { createClient } from "@/lib/supabase/server";
import { daysOld } from "@/types";
import type { Receipt, User } from "@/types";
import Link from "next/link";

export default async function ArchivePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users").select("*").eq("id", user.id).single();

  // Fetch overdue/archived receipts (US users only will have these; CA users = empty)
  const { data: receipts } = await supabase
    .from("receipts")
    .select("*, missing_receipt_form:missing_receipt_forms(*)")
    .eq("user_id", user.id)
    .in("status", ["overdue_flagged", "archived"])
    .order("transaction_date", { ascending: false });

  const country     = (profile as User)?.country ?? "US";
  const typedList   = (receipts as Receipt[]) ?? [];
  const totalAmount = typedList.reduce((s, r) => s + Number(r.amount), 0);

  const categoryEmoji: Record<string, string> = {
    meals: "🍽️", lodging: "🏨", transit: "🚗", other: "📄",
  };

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

      {typedList.length > 0 && (
        <>
          {/* Summary */}
          <div className="mb-5 px-4 py-3 rounded-2xl bg-red-50 border border-red-200">
            <p className="text-xs font-bold text-red-700 mb-0.5">
              {typedList.length} overdue receipt{typedList.length > 1 ? "s" : ""} · ${totalAmount.toFixed(2)} total
            </p>
            <p className="text-[11px] text-red-500">
              These have been removed from your active packets. Export them below as an Overdue Expenses PDF.
            </p>
          </div>

          {/* Receipt list */}
          <div className="space-y-2 mb-6">
            {typedList.map(r => {
              const days   = daysOld(r.transaction_date);
              const isBank = r.source === "bank_transaction";
              const formDone = !!r.missing_receipt_form?.completed_at;

              return (
                <div key={r.id}
                  className="card flex items-center gap-3 border-red-100 bg-red-50/20">
                  {/* Category icon */}
                  <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center flex-shrink-0 text-lg border border-red-100">
                    {categoryEmoji[r.category] ?? "📄"}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{r.vendor_name}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {new Date(r.transaction_date).toLocaleDateString("en-US",
                        { month: "short", day: "numeric", year: "numeric" })}
                      {" · "}{r.category}
                      {" · "}{r.source.replace("_", " ")}
                    </p>
                  </div>

                  {/* Right side */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-sm font-semibold text-gray-900">
                      ${Number(r.amount).toFixed(2)}
                    </span>
                    <span className="badge-overdue">{days}d — overdue</span>
                  </div>

                  {/* Form icon — bank transactions only */}
                  {isBank && (
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border
                      ${formDone
                        ? "bg-green-50 border-green-200"
                        : "bg-yellow-50 border-yellow-200"
                      }`}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <rect x="2.5" y="1" width="9" height="12" rx="1.8"
                          stroke={formDone ? "#16a34a" : "#b45309"} strokeWidth="1.3"/>
                        <path d="M5 5h5M5 7.2h5M5 9.4h3"
                          stroke={formDone ? "#16a34a" : "#b45309"}
                          strokeWidth="1.1" strokeLinecap="round"/>
                        {formDone ? (
                          <>
                            <circle cx="12.2" cy="12.5" r="2.8" fill="#f0fdf4" stroke="#16a34a" strokeWidth="1"/>
                            <path d="M11.2 12.5l.8.8 1.4-1.4" stroke="#16a34a"
                              strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                          </>
                        ) : (
                          <>
                            <circle cx="12.2" cy="12.5" r="2.8" fill="#fefce8" stroke="#b45309" strokeWidth="1"/>
                            <path d="M12.2 10.8v1.5M12.2 13.6v.2" stroke="#b45309"
                              strokeWidth="1.1" strokeLinecap="round"/>
                          </>
                        )}
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Export button */}
          <button className="w-full btn-cyan">
            Export Overdue Expenses PDF
          </button>
          <p className="text-[11px] text-center text-gray-400 mt-2">
            Generates a separate PDF for expense specialist review
          </p>
        </>
      )}
    </div>
  );
}
