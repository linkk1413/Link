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
    // Already loaded
    if (window.paypal) {
      resolve();
      return;
    }

    // Check if script is already in DOM
    const existing = document.getElementById(PAYPAL_SDK_ID) as HTMLScriptElement | null;
    if (existing) {
      // Script exists, wait for it or check if it's already loaded
      if (existing.dataset.loaded === "true") {
        if (window.paypal) {
          resolve();
        } else {
          reject(new Error("PayPal SDK failed to initialize"));
        }
        return;
      }
      if (existing.dataset.loading === "true") {
        // Wait for existing script to finish loading
        const checkInterval = setInterval(() => {
          if (window.paypal) {
            clearInterval(checkInterval);
            resolve();
          } else if (existing.dataset.loaded === "true") {
            clearInterval(checkInterval);
            reject(new Error("PayPal SDK failed to initialize"));
          }
        }, 100);
        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error("PayPal SDK load timeout"));
        }, 10000);
        return;
      }
    }

    const script = document.createElement("script");
    script.id = PAYPAL_SDK_ID;
    script.dataset.loading = "true";
    // Enable card payments explicitly for better mobile support
    // components=buttons includes card fields support
    // data-sdk-integration-source helps PayPal optimize for different environments
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&intent=authorize&currency=${currency}&components=buttons&enable-funding=card&disable-funding=venmo,paylater,credit`;
    script.async = true;
    script.setAttribute("data-page-type", "checkout");
    script.setAttribute("data-sdk-integration-source", "button-factory");
    script.setAttribute("data-csp-nonce", "");
    script.onload = () => {
      script.dataset.loaded = "true";
      script.dataset.loading = "false";
      if (window.paypal) {
        resolve();
      } else {
        reject(new Error("PayPal SDK failed to initialize after load"));
      }
    };
    script.onerror = (e) => {
      script.dataset.loaded = "true";
      script.dataset.loading = "false";
      console.error("PayPal SDK load error:", e);
      reject(new Error("Failed to load PayPal SDK script"));
    };
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
  
  // Cloud Run server URL
  const apiBaseUrl = import.meta.env.VITE_PAYPAL_API_BASE_URL || 
    "https://server-link-190979667993.europe-west3.run.app";
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // PayPal Live Client ID (public key - safe to expose in client code)
    const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || 
      "AWkGBizXAEAdUwUnBMn9I0uinN9MHMm8nT4-TfER-q22tcJIa5YQdMLbNP8t_pGkexK5eeLvnto0Rj3s";
    if (!clientId || !apiBaseUrl) {
      onError?.("Missing PayPal configuration.");
      return;
    }

    let cancelled = false;

    loadPayPalScript(clientId, currency)
      .then(() => {
        if (!cancelled) {
          console.log("PayPal SDK loaded successfully");
          setIsReady(true);
        }
      })
      .catch((err) => {
        console.error("PayPal SDK load failed:", err);
        if (!cancelled) {
          onError?.(err?.message || "Failed to load PayPal SDK.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currency, onError, apiBaseUrl]);

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
      // Use popup flow on mobile for better compatibility
      fundingSource: undefined,
      createOrder: async () => {
        console.log("PayPal createOrder started");
        const response = await fetch(`${apiBaseUrl}/paypalCreateOrder`, {
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

          const response = await fetch(`${apiBaseUrl}/paypalOrderMeta`, {
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
      onClick: (_data: unknown, actions: { resolve: () => void; reject: () => void }) => {
        // This fires when user clicks the button - helps with mobile
        console.log("PayPal button clicked");
        return actions.resolve();
      },
      onCancel: () => {
        console.log("PayPal checkout cancelled");
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
      {!isReady && (
        <div className="flex items-center justify-center py-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="ml-2 text-sm text-muted-foreground">Loading payment options...</span>
        </div>
      )}
      <div ref={buttonRef} className={isReady ? "" : "hidden"} />
      {isReady && (
        <p className="text-xs text-muted-foreground text-center">
          Tip: If card payment doesn't load, try PayPal login or a different browser
        </p>
      )}
    </div>
  );
};

export default PayPalCheckout;
