export type EventType =
  | "receipt_created"
  | "receipt_edited"
  | "receipt_deleted"
  | "pdf_exported"
  | "missing_form_completed"
  | "feedback_submitted"
  | "page_viewed";

export async function trackEvent(
  type: EventType,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: type, metadata }),
    });
  } catch {
    // never let analytics break the app
  }
}
