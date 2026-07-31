// Shared finalization for Moyasar "hold" (authorize) payments.
//
// Moyasar's hosted form uses 3-D Secure for Mada/most Saudi cards, which
// redirects the browser to `callback_url`; for those payments `on_completed`
// never fires. So finalization can be triggered from two places:
//   1. PaymentCallbackPage (primary — after the 3DS redirect back to us)
//   2. MoyasarCheckout's `on_completed` (fallback — non-3DS payments)
//
// Both call this function, which is idempotent: it verifies the payment
// server-side with the secret key and de-duplicates by the Moyasar payment id,
// so a booking/payment is created at most once regardless of how many times it
// is invoked.

import {
  createBooking,
  createPayment,
  getPaymentByOrderId,
  getSubscriptionSettings,
} from "@/lib/firestore";

export interface MoyasarBookingDraft {
  clientId: string;
  providerId: string;
  serviceId: string;
  serviceName: string;
  providerName: string;
  clientName: string;
  clientEmail: string;
  startAt: string; // ISO
  endAt: string; // ISO
  bookingDate: string; // YYYY-MM-DD
  priceTotal: number; // SAR
  locationType: "AT_PROVIDER" | "AT_CLIENT";
  addressText: string;
  lang: string;
}

export const MOYASAR_DRAFT_KEY = "moyasarBookingDraft";

interface MoyasarPaymentRecord {
  id: string;
  status: string;
  amount: number; // halalas
  currency: string;
}

export interface FinalizeResult {
  bookingId: string;
  deduped: boolean;
  paymentStatus: "AUTHORIZED" | "CAPTURED";
}

/**
 * Verify a Moyasar payment, then create the booking + payment record exactly once.
 * Throws on verification failure (wrong status, amount mismatch, network error).
 */
export async function finalizeMoyasarBooking(params: {
  apiBaseUrl: string;
  paymentId: string;
  draft: MoyasarBookingDraft;
}): Promise<FinalizeResult> {
  const { apiBaseUrl, paymentId, draft } = params;

  // 1. De-dupe first: if we already recorded a payment for this Moyasar id, stop.
  const existing = await getPaymentByOrderId(paymentId, draft.clientId);
  if (existing) {
    return {
      bookingId: existing.bookingId,
      deduped: true,
      paymentStatus: existing.status === "CAPTURED" ? "CAPTURED" : "AUTHORIZED",
    };
  }

  // 2. Verify the payment server-side with the secret key. Never trust the
  //    client-reported status/amount.
  const res = await fetch(`${apiBaseUrl}/moyasar/payment/${paymentId}`);
  const payment = (await res.json().catch(() => ({}))) as
    | MoyasarPaymentRecord
    | { error?: string };

  if (!res.ok) {
    throw new Error(
      ("error" in payment && payment.error) || "Could not verify payment",
    );
  }

  const verified = payment as MoyasarPaymentRecord;

  // Manual (hold) payments settle as "authorized"; a non-manual/captured one
  // reports "paid"/"captured". Anything else is not a successful hold.
  const okStatus = ["authorized", "paid", "captured"].includes(
    verified.status,
  );
  if (!okStatus) {
    throw new Error(`Payment not authorized (status: ${verified.status})`);
  }

  // Amount must match the booking price (in halalas). Prevents finalizing a
  // booking against a smaller/unrelated payment.
  const expectedHalalas = Math.round(draft.priceTotal * 100);
  if (verified.amount !== expectedHalalas || verified.currency !== "SAR") {
    throw new Error("Payment amount does not match the booking");
  }

  const paymentStatus: "AUTHORIZED" | "CAPTURED" =
    verified.status === "authorized" ? "AUTHORIZED" : "CAPTURED";

  // 3. Create the booking (PENDING — awaiting provider acceptance).
  const bookingId = await createBooking({
    clientId: draft.clientId,
    providerId: draft.providerId,
    serviceId: draft.serviceId,
    startAt: new Date(draft.startAt),
    endAt: new Date(draft.endAt),
    bookingDate: draft.bookingDate,
    status: "PENDING",
    priceTotal: draft.priceTotal,
    depositAmount: 0,
    locationType: draft.locationType,
    clientName: draft.clientName,
    serviceName: draft.serviceName,
    addressText: draft.addressText,
  });

  // 3b. Platform commission — percentage of the booking price kept by Link,
  // the rest goes to the provider. Configurable in AdminSettingsPage; only
  // applied going forward, never retroactively to existing payments.
  const settings = await getSubscriptionSettings().catch(() => null);
  const commissionPercent = settings?.platformCommissionPercent ?? 0;
  const platformFee =
    Math.round(draft.priceTotal * (commissionPercent / 100) * 100) / 100;
  const providerAmount = draft.priceTotal - platformFee;

  // 4. Record the payment (funds are held until the provider accepts).
  await createPayment({
    bookingId,
    clientId: draft.clientId,
    providerId: draft.providerId,
    payType: "FULL",
    status: paymentStatus,
    gateway: "MOYASAR",
    amount: draft.priceTotal,
    currency: "SAR",
    amountSar: draft.priceTotal,
    amountUsd: 0,
    fxRate: 1,
    orderId: paymentId,
    authorizationId: paymentId,
    platformFee,
    gatewayFee: 0,
    providerAmount,
  });

  // 5. Booking confirmation email (non-blocking). The server looks up the
  // real booking/client/service records itself from bookingId — it no
  // longer trusts recipient/content fields from the client.
  try {
    await fetch(`${apiBaseUrl}/api/auth/send-booking-confirmation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, lang: draft.lang }),
    });
  } catch (emailError) {
    console.error("Failed to send booking confirmation email:", emailError);
  }

  return { bookingId, deduped: false, paymentStatus };
}
