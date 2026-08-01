import { AvailabilityRule } from "@/types";

/**
 * Lightweight, privacy-safe check used only to grey out calendar days the
 * provider never works at all. Uses only the provider's own public schedule
 * config (providers/{id} is publicly readable) — not existing bookings,
 * unlike the full slot computation, which has to run server-side via the
 * getAvailableBookingSlots Cloud Function (firestore.rules scopes booking
 * reads to that booking's own client/provider/admin, so a browsing client
 * can't read other clients' bookings to compute conflicts itself).
 */
export function isProviderWorkingDay(
  date: Date,
  availabilityRules?: AvailabilityRule[],
): boolean {
  if (!availabilityRules || availabilityRules.length === 0) return true;
  return availabilityRules.some((rule) => rule.dayOfWeek === date.getDay());
}

/** "YYYY-MM-DD" in the browser's local time (not UTC) — matches what the
 * calendar widget visually shows regardless of the device's timezone. */
export function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
