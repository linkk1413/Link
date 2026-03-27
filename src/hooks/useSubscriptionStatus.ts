import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProviderProfile } from "./queries/useProviders";
import { checkAndExpireTrial, getUserDocument } from "@/lib/firestore";
import { ProviderProfile } from "@/types";

interface SubscriptionStatus {
  isLocked: boolean;
  isExpired: boolean;
  isTrial: boolean;
  isTrialExpired: boolean; // Trial specifically expired (not regular subscription)
  trialDaysRemaining: number;
  daysUntilExpiry: number;
  profile: ProviderProfile | null;
  isLoading: boolean;
}

/**
 * Hook to check provider's subscription and account status
 * Returns whether account is locked and days until expiration
 * Also checks and expires trials on-access
 * Checks BOTH providers and users collections for subscription data
 */
export const useSubscriptionStatus = (): SubscriptionStatus => {
  const { user } = useAuth();
  const {
    data: profile,
    isLoading,
    refetch,
  } = useProviderProfile(user?.uid || "");
  const [trialJustExpired, setTrialJustExpired] = useState(false);
  const [userSubscriptionData, setUserSubscriptionData] = useState<{
    subscriptionStatus?: string;
    subscriptionEndDate?: Date | { toDate?: () => Date };
    accountStatus?: string;
  } | null>(null);
  const [status, setStatus] = useState<SubscriptionStatus>({
    isLocked: false,
    isExpired: false,
    isTrial: false,
    isTrialExpired: false,
    trialDaysRemaining: 0,
    daysUntilExpiry: -1,
    profile: null,
    isLoading: true,
  });

  // Fetch subscription data from users collection as fallback
  useEffect(() => {
    const fetchUserDoc = async () => {
      if (user?.uid) {
        const userDoc = await getUserDocument(user.uid) as unknown as Record<string, unknown> | null;
        if (userDoc?.subscriptionEndDate) {
          setUserSubscriptionData({
            subscriptionStatus: userDoc.subscriptionStatus as string | undefined,
            subscriptionEndDate: userDoc.subscriptionEndDate as Date | { toDate?: () => Date },
            accountStatus: userDoc.accountStatus as string | undefined,
          });
        }
      }
    };
    fetchUserDoc();
  }, [user?.uid]);

  // Check and expire trial on-access
  useEffect(() => {
    const checkTrial = async () => {
      if (profile?.subscriptionStatus === "TRIAL" && user?.uid) {
        const wasExpired = await checkAndExpireTrial(user.uid);
        if (wasExpired) {
          // Mark that trial just expired
          setTrialJustExpired(true);
          // Refetch profile to get updated status
          refetch();
        }
      }
    };
    checkTrial();
  }, [profile?.subscriptionStatus, user?.uid, refetch]);

  useEffect(() => {
    if (!profile) {
      setStatus({
        isLocked: false,
        isExpired: false,
        isTrial: false,
        isTrialExpired: false,
        trialDaysRemaining: 0,
        daysUntilExpiry: -1,
        profile: null,
        isLoading,
      });
      return;
    }

    // Use subscription data from provider profile, or fallback to users collection
    const subscriptionStatus = profile.subscriptionStatus || userSubscriptionData?.subscriptionStatus;
    const subscriptionEndDate = profile.subscriptionEndDate || userSubscriptionData?.subscriptionEndDate;
    const accountStatus = profile.accountStatus || userSubscriptionData?.accountStatus;

    const isLocked = accountStatus === "LOCKED";
    const isTrial = subscriptionStatus === "TRIAL";
    // Treat undefined or missing status as expired
    const isExpired =
      !subscriptionStatus ||
      subscriptionStatus === "EXPIRED" ||
      subscriptionStatus === "CANCELLED";

    // Check if trial just expired (either just detected or profile shows it was a trial)
    // We check wasOnTrial from profile if available, or use local state
    const isTrialExpired = trialJustExpired || (isExpired && profile.wasOnTrial === true);

    let daysUntilExpiry = -1;
    let trialDaysRemaining = 0;
    if (subscriptionEndDate) {
      const today = new Date();
      // Handle Firestore Timestamp or regular Date
      let endDate: Date;
      const rawDate = subscriptionEndDate as { toDate?: () => Date } | Date | string;
      if (
        rawDate &&
        typeof rawDate === "object" &&
        "toDate" in rawDate &&
        typeof rawDate.toDate === "function"
      ) {
        // Firestore Timestamp
        endDate = rawDate.toDate();
      } else if (rawDate instanceof Date) {
        endDate = rawDate;
      } else {
        endDate = new Date(rawDate as string);
      }

      daysUntilExpiry = Math.ceil(
        (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      // If in trial, calculate trial days remaining
      if (isTrial) {
        trialDaysRemaining = Math.max(0, daysUntilExpiry);
      }
    }

    setStatus({
      isLocked,
      isExpired,
      isTrial,
      isTrialExpired,
      trialDaysRemaining,
      daysUntilExpiry,
      profile,
      isLoading,
    });
  }, [profile, isLoading, trialJustExpired, userSubscriptionData]);

  return status;
};
