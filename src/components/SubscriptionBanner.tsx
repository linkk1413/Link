import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Lock, Clock, X, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

interface SubscriptionBannerProps {
  dismissible?: boolean;
}

// Countdown timer component for urgent expiration (≤3 days)
const CountdownTimer: React.FC<{ endDate: Date }> = ({ endDate }) => {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = endDate.getTime();
      const diff = Math.max(0, end - now);

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        mins: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        secs: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  return (
    <div className="flex items-center gap-1 font-mono text-sm font-bold">
      <span className="rounded bg-white/20 px-1.5 py-0.5">{timeLeft.days}{t("provider.days", "d")}</span>
      <span>:</span>
      <span className="rounded bg-white/20 px-1.5 py-0.5">{String(timeLeft.hours).padStart(2, "0")}{t("provider.hours", "h")}</span>
      <span>:</span>
      <span className="rounded bg-white/20 px-1.5 py-0.5">{String(timeLeft.mins).padStart(2, "0")}{t("provider.minutes", "m")}</span>
      <span>:</span>
      <span className="rounded bg-white/20 px-1.5 py-0.5">{String(timeLeft.secs).padStart(2, "0")}{t("provider.seconds", "s")}</span>
    </div>
  );
};

export const SubscriptionBanner: React.FC<SubscriptionBannerProps> = ({
  dismissible = true,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isDismissed, setIsDismissed] = useState(false);
  const { isLocked, isExpired, isTrial, isTrialExpired, daysUntilExpiry, profile } =
    useSubscriptionStatus();

  // Parse end date for countdown
  const endDate = useMemo(() => {
    if (!profile?.subscriptionEndDate) return null;
    const rawDate = profile.subscriptionEndDate as { toDate?: () => Date } | Date | string;
    if (rawDate && typeof rawDate === "object" && "toDate" in rawDate && typeof rawDate.toDate === "function") {
      return rawDate.toDate();
    } else if (rawDate instanceof Date) {
      return rawDate;
    } else {
      return new Date(rawDate as string);
    }
  }, [profile?.subscriptionEndDate]);

  // Check if subscription is effectively expired (end date passed but status not updated)
  const isEffectivelyExpired = endDate && endDate.getTime() < new Date().getTime();
  
  // Show countdown for urgent expiration (≤3 days remaining, including 0)
  const showCountdown = daysUntilExpiry >= 0 && daysUntilExpiry <= 3 && endDate && !isEffectivelyExpired;

  // Don't show banner if dismissed, in trial, or subscription is fine (>7 days left)
  if (
    isDismissed ||
    isTrial ||
    (!isLocked && !isExpired && !isTrialExpired && !isEffectivelyExpired && daysUntilExpiry > 7)
  ) {
    return null;
  }

  if (isLocked) {
    return (
      <div className="border-b border-red-200 bg-red-50 px-4 py-4 text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
        <div className="container flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">
                {t("provider.accountLockedTitle")}
              </p>
              <p className="text-sm text-red-800 dark:text-red-200">
                {t("provider.accountLockedMessage")}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/provider/subscription")}
            className="border-red-300 text-red-900 hover:bg-red-100 dark:border-red-700 dark:text-red-100 dark:hover:bg-red-900/40"
          >
            {t("provider.subscribeNow")}
          </Button>
        </div>
      </div>
    );
  }

  // Trial expired - show specific message
  if (isTrialExpired) {
    return (
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-4 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100">
        <div className="container flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">
                {t("provider.trialExpiredTitle")}
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {t("provider.trialExpiredMessage")}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/provider/subscription")}
            className="border-amber-300 text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-100 dark:hover:bg-amber-900/40"
          >
            {t("provider.subscribeNow")}
          </Button>
        </div>
      </div>
    );
  }

  // Expired or urgent countdown banner (≤3 days remaining OR already expired) - Red styling with timer
  if (isExpired || isEffectivelyExpired || showCountdown) {
    return (
      <div className="border-b border-red-300 bg-gradient-to-r from-red-500 to-red-600 px-4 py-4 text-white">
        <div className="container flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Timer className="mt-0.5 h-5 w-5 flex-shrink-0 animate-pulse" />
            <div className="flex-1">
              <p className="font-semibold">
                {isExpired || isEffectivelyExpired
                  ? t("provider.subscriptionExpiredTitle")
                  : t("provider.subscriptionExpiringUrgent", "Subscription Expiring Soon!")}
              </p>
              <p className="mb-2 text-sm text-red-100">
                {isExpired || isEffectivelyExpired
                  ? t("provider.subscriptionExpiredMessage")
                  : t("provider.renewToKeepAccess", "Renew now to keep your account active")}
              </p>
              {endDate && <CountdownTimer endDate={endDate} />}
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => navigate("/provider/subscription")}
            className="bg-white text-red-600 hover:bg-red-50"
          >
            {t("provider.renewNow")}
          </Button>
        </div>
      </div>
    );
  }

  // Normal expiring banner (4-7 days) - Amber styling
  if (daysUntilExpiry > 3 && daysUntilExpiry <= 7) {
    return (
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-4 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100">
        <div className="container flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">
                {t("provider.subscriptionExpiringTitle")}
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {t("provider.subscriptionExpiringMessage", {
                  days: daysUntilExpiry,
                })}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/provider/subscription")}
            className="border-amber-300 text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-100 dark:hover:bg-amber-900/40"
          >
            {t("provider.renewNow")}
          </Button>
          {dismissible && (
            <button
              onClick={() => setIsDismissed(true)}
              className="absolute right-4 top-4 text-amber-600 hover:text-amber-700 dark:hover:text-amber-500"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
};
