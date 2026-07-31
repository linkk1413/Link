// Shared finalization for Moyasar subscription payments (immediate capture).
//
// Like the booking flow, Moyasar's 3-D Secure redirects the browser to a
// callback URL, so `on_completed` does not fire for most Saudi cards. Both the
// on_completed fallback (SubscriptionPaymentPage) and the 3DS callback
// (SubscriptionCallbackPage) call this. It is idempotent: it verifies the
// payment server-side and de-dupes by the Moyasar payment id (stored in the
// provider doc's lastPaymentOrderId), so a subscription is activated once.

import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { reactivateProviderServices } from "@/lib/firestore";

export interface MoyasarSubscriptionDraft {
  uid: string;
  planId: string;
  planName: string;
  planMonths: number;
  price: number; // SAR
  providerName: string;
  providerEmail: string;
  lang: string;
}

export const MOYASAR_SUB_DRAFT_KEY = "moyasarSubscriptionDraft";

interface MoyasarPaymentRecord {
  id: string;
  status: string;
  amount: number; // halalas
  currency: string;
}

export interface FinalizeSubscriptionResult {
  deduped: boolean;
  endDate: Date;
}

/**
 * Verify a Moyasar payment, then activate the provider's subscription exactly
 * once. Throws on verification failure (wrong status, amount mismatch, network).
 */
export async function finalizeMoyasarSubscription(params: {
  apiBaseUrl: string;
  paymentId: string;
  draft: MoyasarSubscriptionDraft;
}): Promise<FinalizeSubscriptionResult> {
  const { apiBaseUrl, paymentId, draft } = params;

  const providerRef = doc(db, "providers", draft.uid);
  const userRef = doc(db, "users", draft.uid);

  // 1. De-dupe: if this Moyasar payment already activated the sub, stop.
  const providerSnap = await getDoc(providerRef);
  const providerData = providerSnap.exists() ? providerSnap.data() : {};
  if (providerData?.lastPaymentOrderId === paymentId) {
    const existingEnd =
      providerData?.subscriptionEndDate?.toDate?.() ?? new Date();
    return { deduped: true, endDate: existingEnd };
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
  const okStatus = ["paid", "captured"].includes(verified.status);
  if (!okStatus) {
    throw new Error(`Payment not completed (status: ${verified.status})`);
  }

  const expectedHalalas = Math.round(draft.price * 100);
  if (verified.amount !== expectedHalalas || verified.currency !== "SAR") {
    throw new Error("Payment amount does not match the selected plan");
  }

  // 3. Compute the new end date. Extend from the later of now / current end so
  //    early renewals add time instead of resetting it.
  const now = new Date();
  const currentEnd: Date | null =
    providerData?.subscriptionEndDate?.toDate?.() ?? null;
  const base = currentEnd && currentEnd > now ? currentEnd : now;
  const endDate = new Date(base);
  endDate.setMonth(endDate.getMonth() + draft.planMonths);

  const subscriptionData = {
    // Uppercase: every reader (rules, banner, service gating) compares to "ACTIVE".
    subscriptionStatus: "ACTIVE",
    subscriptionStartDate: Timestamp.fromDate(now),
    subscriptionEndDate: Timestamp.fromDate(endDate),
    subscriptionPlanId: draft.planId,
    subscriptionPlanMonths: draft.planMonths,
    lastPaymentDate: Timestamp.fromDate(now),
    lastPaymentAmount: draft.price,
    lastPaymentGateway: "MOYASAR",
    lastPaymentOrderId: paymentId,
    lastPaymentAuthorizationId: paymentId,
    accountStatus: "ACTIVE",
    isSubscribed: true,
    wasOnTrial: false,
  };

  // 4. Activate on both docs (banner reads from providers). Use setDoc+merge,
  //    not updateDoc: a provider subscribing for the first time may not have a
  //    providers/{uid} doc yet, and updateDoc throws on a missing document —
  //    which would fail the whole activation even though the payment went
  //    through. merge creates it when absent and patches it when present.
  await Promise.all([
    setDoc(userRef, subscriptionData, { merge: true }),
    setDoc(providerRef, subscriptionData, { merge: true }),
  ]);

  // 5. Restore the ads that were auto-hidden when the subscription lapsed.
  try {
    await reactivateProviderServices(draft.uid);
  } catch (err) {
    console.warn("Failed to restore services after renewal:", err);
  }

  // 6. Notify admin (non-blocking).
  try {
    await fetch(`${apiBaseUrl}/api/auth/notify-admin-subscription`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerId: draft.uid,
        planName: draft.planName,
        planMonths: draft.planMonths,
        amount: draft.price,
        orderId: paymentId,
        gateway: "Moyasar",
      }),
    });
  } catch (err) {
    console.warn("Admin subscription notification failed:", err);
  }

  return { deduped: false, endDate };
}
