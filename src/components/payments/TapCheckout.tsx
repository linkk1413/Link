import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CreditCard, Loader2 } from "lucide-react";

type TapCheckoutProps = {
  amount: number;
  bookingMeta: { serviceId: string; providerId: string };
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  onSuccess: (payload: { chargeId: string; status: string }) => Promise<void>;
  onError?: (message: string) => void;
};

declare global {
  interface Window {
    goSell?: { openLightBox: () => void; config: (config: unknown) => void };
  }
}

const loadTapScript = () =>
  new Promise<void>((resolve, reject) => {
    if (window.goSell) {
      resolve();
      return;
    }
    const existing = document.getElementById("tap-gosell-script");
    if (existing) {
      const check = setInterval(() => {
        if (window.goSell) {
          clearInterval(check);
          resolve();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(check);
        reject(new Error("Tap SDK timeout"));
      }, 10000);
      return;
    }
    const script = document.createElement("script");
    script.id = "tap-gosell-script";
    script.src = "https://goSellJSLib.b-cdn.net/v2.0.0/js/gosell.js";
    script.async = true;
    script.onload = () =>
      window.goSell ? resolve() : reject(new Error("Tap SDK failed"));
    script.onerror = () => reject(new Error("Failed to load Tap SDK"));
    document.body.appendChild(script);
  });

const TapCheckout: React.FC<TapCheckoutProps> = ({
  amount,
  bookingMeta,
  customerEmail,
  customerName,
  customerPhone,
  onSuccess,
  onError,
}) => {
  const { t, i18n } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const publishableKey = import.meta.env.VITE_TAP_PUBLISHABLE_KEY;
  const callbackUrl =
    import.meta.env.VITE_TAP_CALLBACK_URL ||
    `${window.location.origin}/client/tap-callback`;

  useEffect(() => {
    if (!publishableKey) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    loadTapScript()
      .then(() => {
        if (!cancelled) {
          setIsReady(true);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          onError?.(err?.message);
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [publishableKey, onError]);

  useEffect(() => {
    if (!isReady || !window.goSell || !publishableKey) return;
    try {
      window.goSell.config({
        containerID: "tap-payment-container",
        gateway: {
          publicKey: publishableKey,
          language: i18n.language === "ar" ? "ar" : "en",
          supportedCurrencies: "all",
          supportedPaymentMethods: "all",
          saveCardOption: false,
          customerCards: false,
          notifications: "standard",
          callback: (response: {
            id: string;
            status: string;
            response?: { message: string };
          }) => {
            console.log("Tap response:", response);
            if (
              response.status === "CAPTURED" ||
              response.status === "AUTHORIZED"
            ) {
              onSuccess({ chargeId: response.id, status: response.status });
            } else if (
              response.status === "DECLINED" ||
              response.status === "FAILED"
            ) {
              onError?.(response.response?.message || "Payment failed");
            }
          },
          onClose: () => {
            console.log("Tap closed");
          },
        },
        customer: {
          first_name: customerName.split(" ")[0] || "Guest",
          last_name: customerName.split(" ").slice(1).join(" ") || "Customer",
          email: customerEmail || "guest@example.com",
          phone: { 
            country_code: "966", 
            number: "500000000"
          },
        },
        order: {
          amount: Number(amount),
          currency: "SAR",
          items: [],
        },
        transaction: {
          mode: "charge",
          charge: {
            saveCard: false,
            threeDSecure: true,
            description: "Service Booking",
            statement_descriptor: "LINK",
            reference: {
              transaction: `txn_${Date.now()}`,
              order: `order_${Date.now()}`,
            },
            metadata: {},
            receipt: { email: false, sms: false },
            redirect: callbackUrl,
            post: null,
          },
        },
      });
    } catch (error) {
      console.error("Tap config error:", error);
      onError?.(t("payment.initError", "Failed to initialize payment"));
    }
  }, [
    isReady,
    amount,
    bookingMeta,
    customerEmail,
    customerName,
    customerPhone,
    publishableKey,
    callbackUrl,
    i18n.language,
    onSuccess,
    onError,
    t,
  ]);

  const handlePayClick = () => {
    if (window.goSell) {
      window.goSell.openLightBox();
    }
  };

  if (!publishableKey) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-sm text-destructive">
        {t("payment.tapNotConfigured", "Tap payment not configured. Add VITE_TAP_PUBLISHABLE_KEY.")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ms-2 text-sm text-muted-foreground">
            {t("payment.loadingPayment", "Loading payment...")}
          </span>
        </div>
      )}
      <div
        id="tap-payment-container"
        style={{ display: isLoading ? "none" : "block" }}
      />
      {isReady && (
        <button
          onClick={handlePayClick}
          className="w-full rounded-lg bg-[#2ace00] py-3 px-4 text-white font-medium hover:bg-[#25b800] transition-colors flex items-center justify-center gap-2"
        >
          <CreditCard className="h-5 w-5" />
          {t("payment.payWithCard", "Pay")} {amount.toFixed(2)} SAR
        </button>
      )}
      <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
        <span>mada</span>
        <span>Visa/MC</span>
        <span>Apple Pay</span>
      </div>
      <p className="text-xs text-center text-muted-foreground">
        {t("payment.securedByTap", "Secured by Tap Payments")}
      </p>
    </div>
  );
};

export default TapCheckout;
