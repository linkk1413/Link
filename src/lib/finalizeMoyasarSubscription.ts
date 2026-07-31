// Shared finalization for Moyasar subscription payments (immediate capture).
//
// Like the booking flow, Moyasar's 3-D Secure redirects the browser to a
// callback URL, so `on_completed` does not fire for most Saudi cards. Both the
// on_completed fallback (SubscriptionPaymentPage) and the 3DS callback
// (SubscriptionCallbackPage) call this. It delegates to the `activateSubscription`
// Cloud Function, which re-verifies the payment with Moyasar's secret key and
// writes the subscription fields via the Admin SDK — the browser never writes
// subscriptionStatus/accountStatus/isSubscribed directly, since firestore.rules
// blocks a provider from self-granting those on their own document.

import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

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

export interface FinalizeSubscriptionResult {
  deduped: boolean;
  endDate: Date;
}

interface ActivateSubscriptionResponse {
  deduped: boolean;
  endDate: string;
}

export async function finalizeMoyasarSubscription(params: {
  apiBaseUrl: string;
  paymentId: string;
  draft: MoyasarSubscriptionDraft;
}): Promise<FinalizeSubscriptionResult> {
  const { apiBaseUrl, paymentId, draft } = params;

  // Verification + the actual subscription write both happen inside the
  // Cloud Function (Admin SDK) — never trust the client-reported status here.
  const activate = httpsCallable<
    {
      paymentId: string;
      planId: string;
      planName: string;
      planMonths: number;
      price: number;
    },
    ActivateSubscriptionResponse
  >(functions, "activateSubscription");

  const result = await activate({
    paymentId,
    planId: draft.planId,
    planName: draft.planName,
    planMonths: draft.planMonths,
    price: draft.price,
  });

  // Notify admin (non-blocking, best-effort — not security sensitive).
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

  return {
    deduped: result.data.deduped,
    endDate: new Date(result.data.endDate),
  };
}
