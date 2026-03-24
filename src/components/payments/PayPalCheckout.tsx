import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type PayPalCheckoutProps = {
  amount: number;
  currency?: string;
  bookingMeta: {
    serviceId: string;
    providerId: string;
  };
  onAuthorized: (payload: {
    orderId: string;
    authorizationId: string;
    amountUsd: number;
    fxRate: number;
  }) => Promise<void>;
  onError?: (message: string) => void;
};

// PayPal SDK type - external library without TypeScript definitions
interface PayPalSDK {
  Buttons: (config: {
    style?: Record<string, string>;
    createOrder?: () => Promise<string>;
    onApprove?: (
      data: unknown,
      actions: { order: { authorize: () => Promise<unknown> } },
    ) => Promise<void>;
    onError?: (err: unknown) => void;
  }) => {
    render: (container: HTMLElement) => Promise<void>;
    close?: () => void;
  };
}

declare global {
  interface Window {
    paypal?: PayPalSDK;
  }
}

const PAYPAL_SDK_ID = "paypal-js-sdk";

const loadPayPalScript = (clientId: string, currency: string) =>
  new Promise<void>((resolve, reject) => {
    if (window.paypal) {
      resolve();
      return;
    }

    const existing = document.getElementById(PAYPAL_SDK_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject());
      return;
    }

    const script = document.createElement("script");
    script.id = PAYPAL_SDK_ID;
    // Card-only: disable PayPal, Venmo, PayLater; enable only card funding
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&intent=authorize&currency=${currency}&disable-funding=venmo,paypal,paylater,credit&enable-funding=card`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject();
    document.body.appendChild(script);
  });

const PayPalCheckout: React.FC<PayPalCheckoutProps> = ({
  amount,
  currency = "USD",
  bookingMeta,
  onAuthorized,
  onError,
}) => {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const buttonsInstanceRef = useRef<{ close?: () => void } | null>(null);
  const renderKeyRef = useRef<string>("");
  const renderingRef = useRef(false);
  const apiBaseUrl = import.meta.env.VITE_PAYPAL_API_BASE_URL as
    | string
    | undefined;
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID as
      | string
      | undefined;
    if (!clientId || !apiBaseUrl) {
      onError?.("Missing PayPal configuration.");
      return;
    }

    let cancelled = false;

    loadPayPalScript(clientId, currency)
      .then(() => {
        if (!cancelled) setIsReady(true);
      })
      .catch(() => {
        if (!cancelled) onError?.("Failed to load PayPal SDK.");
      });

    return () => {
      cancelled = true;
    };
  }, [currency, onError]);

  useEffect(() => {
    if (!isReady || !buttonRef.current) return;
    if (!window.paypal || renderingRef.current) return;

    const nextKey = `${amount}-${currency}-${bookingMeta.serviceId}-${bookingMeta.providerId}`;
    if (renderKeyRef.current === nextKey) return;

    renderingRef.current = true;

    if (buttonsInstanceRef.current?.close) {
      try {
        buttonsInstanceRef.current.close();
      } catch {
        // ignore close errors
      }
    }

    buttonRef.current.innerHTML = "";

    const instance = window.paypal.Buttons({
      style: {
        layout: "vertical",
        shape: "pill",
        label: "pay",
        color: "black",
      },
      fundingSource: "card" as unknown as undefined, // Force card-only display
      createOrder: async () => {
        const response = await fetch(`${apiBaseUrl}/paypal/create-order`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amountSar: amount,
            serviceId: bookingMeta.serviceId,
            providerId: bookingMeta.providerId,
          }),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          const serverMessage =
            typeof data?.error === "string"
              ? data.error
              : "Failed to create PayPal order";
          throw new Error(serverMessage);
        }

        if (!data?.orderId) {
          throw new Error("Invalid PayPal order response");
        }
        if (!data?.amountUsd || !data?.fxRate) {
          throw new Error("Missing conversion data");
        }

        return data.orderId;
      },
      onApprove: async (
        _data: unknown,
        actions: { order: { authorize: () => Promise<{
          id?: string;
          purchase_units?: Array<{
            payments?: {
              authorizations?: Array<{ id?: string }>;
            };
          }>;
        }> } },
      ) => {
        try {
          const authorization = await actions.order.authorize();
          const authorizationId =
            authorization?.purchase_units?.[0]?.payments?.authorizations?.[0]
              ?.id;
          const orderId = authorization?.id;

          if (!authorizationId || !orderId) {
            throw new Error("Missing authorization id");
          }

          const response = await fetch(`${apiBaseUrl}/paypal/order-meta`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId }),
          });

          const meta = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(meta?.error || "Failed to read order meta");
          }

          await onAuthorized({
            orderId,
            authorizationId,
            amountUsd: meta.amountUsd,
            fxRate: meta.fxRate,
          });
        } catch (err) {
          console.error("PayPal approve error", err);
          onError?.("Authorization failed. Please try again.");
        }
      },
      onError: (err: Error) => {
        console.error("PayPal error", err);
        onError?.("PayPal checkout failed. Please try again.");
      },
    });

    buttonsInstanceRef.current = instance;

    instance
      .render(buttonRef.current)
      .catch((err: Error) => {
        console.error("PayPal render error", err);
        onError?.("PayPal buttons failed to render.");
      })
      .finally(() => {
        renderKeyRef.current = nextKey;
        renderingRef.current = false;
      });
  }, [
    amount,
    bookingMeta.providerId,
    bookingMeta.serviceId,
    currency,
    isReady,
    onAuthorized,
    onError,
  ]);

  if (!import.meta.env.VITE_PAYPAL_CLIENT_ID || !apiBaseUrl) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        PayPal setup is missing. Add VITE_PAYPAL_CLIENT_ID and
        VITE_PAYPAL_API_BASE_URL.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div ref={buttonRef} />
      <Button type="button" variant="outline" className="w-full" disabled>
        {`Pay ${amount.toFixed(2)} ${currency}`}
      </Button>
    </div>
  );
};

export default PayPalCheckout;
