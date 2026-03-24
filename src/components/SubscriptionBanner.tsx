import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Lock, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

interface SubscriptionBannerProps {
  dismissible?: boolean;
}

export const SubscriptionBanner: React.FC<SubscriptionBannerProps> = ({
  dismissible = true,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isDismissed, setIsDismissed] = React.useState(false);
  const { isLocked, isExpired, isTrial, isTrialExpired, daysUntilExpiry } =
    useSubscriptionStatus();

  // Don't show banner if dismissed, in trial, or subscription is fine (>7 days left)
  if (
    isDismissed ||
    isTrial ||
    (!isLocked && !isExpired && !isTrialExpired && daysUntilExpiry > 7)
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

  if (isExpired) {
    return (
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-4 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100">
        <div className="container flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">
                {t("provider.subscriptionExpiredTitle")}
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {t("provider.subscriptionExpiredMessage")}
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

  if (daysUntilExpiry > 0 && daysUntilExpiry <= 7) {
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
