export type Country = "US" | "CA";

export type ReceiptSource = "photo" | "email" | "concur" | "bank_transaction" | "manual";

export type ReceiptStatus = "active" | "overdue_flagged" | "archived";

export type ReceiptCategory = "meals" | "lodging" | "transit" | "other";

export type PacketStatus = "draft" | "exported";

export type NotificationType = "day_55_warning" | "day_60_overdue" | "day_61_archived";

export type NotificationChannel = "in_app" | "email";

export interface User {
  id: string;
  email: string;
  name: string;
  country: Country;
  city?: string | null;
  concur_connected: boolean;
  created_at: string;
}

export interface Receipt {
  id: string;
  user_id: string;
  vendor_name: string;
  transaction_date: string;      // ISO date — 60-day clock starts here
  amount: number;
  currency: string;
  category: ReceiptCategory;
  source: ReceiptSource;
  image_url: string | null;
  status: ReceiptStatus;
  archived_at: string | null;
  notes: string | null;
  created_at: string;
  missing_receipt_form?: MissingReceiptForm | null;
  days_old?: number;             // computed client-side
}

export interface MissingReceiptForm {
  id: string;
  receipt_id: string;
  business_purpose: string;
  reason: string;
  signature_url: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface Packet {
  id: string;
  user_id: string;
  label: string;
  client_name: string | null;
  date_from: string;
  date_to: string;
  status: PacketStatus;
  exported_at: string | null;
  created_at: string;
  receipts?: Receipt[];
}

export interface Notification {
  id: string;
  user_id: string;
  receipt_id: string;
  type: NotificationType;
  channel: NotificationChannel;
  sent_at: string;
  read_at: string | null;
}

// Computed helper — days since transaction_date
export function daysOld(transactionDate: string): number {
  const txDate = new Date(transactionDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  txDate.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));
}

// Policy applies to US employees only
export function isPolicyApplicable(country: Country): boolean {
  return country === "US";
}
