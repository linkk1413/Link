import React, { useState, useCallback, createContext, useContext } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

const TRACKING_CONSENT_KEY = "tracking_consent";

type ConsentStatus = "granted" | "denied" | "pending";

export const useTrackingConsent = () => {
  const [consentStatus, setConsentStatus] = useState<ConsentStatus>(() => {
    const stored = localStorage.getItem(TRACKING_CONSENT_KEY);
    return (stored as ConsentStatus) || "pending";
  });

  const grantConsent = () => {
    localStorage.setItem(TRACKING_CONSENT_KEY, "granted");
    setConsentStatus("granted");
    // Here you would initialize analytics/tracking
    console.log("Tracking consent granted");
  };

  const denyConsent = () => {
    localStorage.setItem(TRACKING_CONSENT_KEY, "denied");
    setConsentStatus("denied");
    // Here you would disable analytics/tracking
    console.log("Tracking consent denied");
  };

  const revokeConsent = () => {
    // Remove consent and location data
    localStorage.removeItem(TRACKING_CONSENT_KEY);
    localStorage.removeItem("link_location");
    setConsentStatus("pending");
    console.log("Tracking consent revoked");
  };

  return { consentStatus, grantConsent, denyConsent, revokeConsent };
};

// Context to trigger tracking consent dialog from anywhere
type TrackingConsentContextType = {
  requestTrackingConsent: (onGranted?: () => void) => void;
  revokeConsent: () => void;
  consentStatus: ConsentStatus;
};

const TrackingConsentContext = createContext<TrackingConsentContextType | null>(
  null,
);

export const useRequestTrackingConsent = () => {
  const context = useContext(TrackingConsentContext);
  if (!context) {
    throw new Error(
      "useRequestTrackingConsent must be used within TrackingConsentProvider",
    );
  }
  return context;
};

export const TrackingConsent: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const { t } = useTranslation();
  const { consentStatus, grantConsent, revokeConsent } = useTrackingConsent();
  const [isOpen, setIsOpen] = useState(false);
  const [onGrantedCallback, setOnGrantedCallback] = useState<
    (() => void) | null
  >(null);

  // Function to request tracking consent - called when user tries to use a feature that needs tracking
  const requestTrackingConsent = useCallback(
    (onGranted?: () => void) => {
      if (consentStatus === "granted") {
        // Already granted, just run the callback
        onGranted?.();
        return;
      }
      if (consentStatus === "denied") {
        // Previously denied - could show a "go to settings" message, but for now just don't show dialog
        return;
      }
      // Pending - show the dialog
      if (onGranted) {
        setOnGrantedCallback(() => onGranted);
      }
      setIsOpen(true);
    },
    [consentStatus],
  );

  const handleAllow = () => {
    grantConsent();
    setIsOpen(false);
    // Run the callback after granting
    onGrantedCallback?.();
    setOnGrantedCallback(null);
  };

  // User delays - just close dialog, don't set consent (stays pending for next time)
  const handleNotNow = () => {
    setIsOpen(false);
    setOnGrantedCallback(null);
  };

  return (
    <TrackingConsentContext.Provider
      value={{ requestTrackingConsent, revokeConsent, consentStatus }}
    >
      {children}
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleNotNow()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <DialogTitle className="text-center text-xl">
              {t("tracking.title")}
            </DialogTitle>
            <DialogDescription className="text-center">
              {t("tracking.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 rounded-lg bg-muted p-4 text-sm text-muted-foreground">
            <p className="mb-2 font-medium text-foreground">
              {t("tracking.whatWeCollect")}
            </p>
            <ul className="list-inside list-disc space-y-1">
              <li>{t("tracking.item1")}</li>
              <li>{t("tracking.item2")}</li>
              <li>{t("tracking.item3")}</li>
            </ul>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Button onClick={handleAllow} className="w-full">
              {t("common.next")}
            </Button>
            <Button
              variant="ghost"
              onClick={handleNotNow}
              className="w-full text-muted-foreground"
            >
              {t("common.notNow")}
            </Button>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            {t("tracking.changeAnytime")}
          </p>
        </DialogContent>
      </Dialog>
    </TrackingConsentContext.Provider>
  );
};

export default TrackingConsent;
