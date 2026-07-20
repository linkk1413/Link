import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { providerKeys } from "@/hooks/queries/useProviders";
import {
  finalizeMoyasarSubscription,
  MOYASAR_SUB_DRAFT_KEY,
  type MoyasarSubscriptionDraft,
} from "@/lib/finalizeMoyasarSubscription";

const SubscriptionCallbackPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Drop the cached (still-expired) provider profile so the dashboard refetches
  // and the "subscription expired" banner clears right after renewal.
  const refreshSubscriptionCache = (uid: string) => {
    queryClient.invalidateQueries({ queryKey: providerKeys.detail(uid) });
    queryClient.invalidateQueries({ queryKey: providerKeys.all });
  };
  const [status, setStatus] = useState<"loading" | "success" | "failed">(
    "loading",
  );
  const [message, setMessage] = useState("");
  const finalizedRef = useRef(false);

  useEffect(() => {
    const paymentId = searchParams.get("id");
    const paymentStatus = searchParams.get("status");
    const paymentMessage = searchParams.get("message");

    const finalize = async () => {
      if (finalizedRef.current) return;
      finalizedRef.current = true;

      // Lenient pre-filter; finalizeMoyasarSubscription re-verifies the real
      // status server-side. Accept "authorized" too so 3DS cards that report it
      // in the redirect are not rejected before that server check runs.
      const succeeded =
        paymentStatus &&
        ["authorized", "paid", "captured"].includes(paymentStatus);

      if (!paymentId || !succeeded) {
        setStatus("failed");
        setMessage(paymentMessage || t("payment.paymentFailed"));
        return;
      }

      const apiBaseUrl =
        import.meta.env.VITE_MOYASAR_API_BASE_URL ||
        import.meta.env.VITE_PAYPAL_API_BASE_URL ||
        "https://server-link-190979667993.europe-west3.run.app";

      try {
        const draftRaw = sessionStorage.getItem(MOYASAR_SUB_DRAFT_KEY);
        if (draftRaw) {
          const draft = JSON.parse(draftRaw) as MoyasarSubscriptionDraft;
          await finalizeMoyasarSubscription({ apiBaseUrl, paymentId, draft });
          sessionStorage.removeItem(MOYASAR_SUB_DRAFT_KEY);
          refreshSubscriptionCache(draft.uid);
          setStatus("success");
          setMessage(
            t("subscription.subscriptionActivated") ||
              "Your subscription is now active.",
          );
          return;
        }

        // No draft in this tab — maybe already activated by on_completed.
        if (user) {
          const snap = await getDoc(doc(db, "providers", user.uid));
          if (snap.exists() && snap.data()?.lastPaymentOrderId === paymentId) {
            refreshSubscriptionCache(user.uid);
            setStatus("success");
            setMessage(
              t("subscription.subscriptionActivated") ||
                "Your subscription is now active.",
            );
            return;
          }
        }
        setStatus("failed");
        setMessage(t("payment.paymentNotCompleted"));
      } catch (error) {
        console.error("Failed to finalize Moyasar subscription:", error);
        setStatus("failed");
        setMessage(
          error instanceof Error ? error.message : t("payment.paymentFailed"),
        );
      }
    };

    finalize();
  }, [searchParams, t, user]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full rounded-2xl bg-card p-8 text-center shadow-lg"
      >
        {status === "loading" && (
          <>
            <Loader2 className="mx-auto h-16 w-16 animate-spin text-primary" />
            <h1 className="mt-4 text-xl font-semibold text-foreground">
              {t("payment.processing")}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {t("common.pleaseWait")}
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 10 }}
            >
              <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
            </motion.div>
            <h1 className="mt-4 text-xl font-semibold text-foreground">
              {t("subscription.paymentSuccess") || "Payment Successful!"}
            </h1>
            <p className="mt-2 text-muted-foreground">{message}</p>
            <Button className="mt-6 w-full" onClick={() => navigate("/provider")}>
              {t("subscription.goToDashboard") || "Go to Dashboard"}
            </Button>
          </>
        )}

        {status === "failed" && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 10 }}
            >
              <XCircle className="mx-auto h-16 w-16 text-destructive" />
            </motion.div>
            <h1 className="mt-4 text-xl font-semibold text-foreground">
              {t("payment.paymentFailed")}
            </h1>
            <p className="mt-2 text-muted-foreground">{message}</p>
            <div className="mt-6 space-y-2">
              <Button
                className="w-full"
                onClick={() => navigate("/provider/subscription")}
              >
                {t("common.tryAgain")}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/provider")}
              >
                {t("subscription.goToDashboard") || "Go to Dashboard"}
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default SubscriptionCallbackPage;
