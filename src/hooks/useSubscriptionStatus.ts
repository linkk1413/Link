import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProviderProfile } from "./queries/useProviders";
import {
  checkAndExpireSubscription,
  getUserDocument,
  normalizeSubscriptionStatus,
} from "@/lib/firestore";
import { ProviderProfile } from "@/types";

interface SubscriptionStatus {
  isLocked: boolean;
  isExpired: boolean;
  isTrial: boolean;
  isTrialExpired: boolean; // Trial specifically expired (not regular subscription)
  /** May the provider publish services right now? */
  canPublish: boolean;
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
    canPublish: false,
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

  // Expire a lapsed subscription (trial or paid) on access. This is also what
  // takes the provider's ads down when the subscription runs out.
  useEffect(() => {
    const checkExpiry = async () => {
      const current = normalizeSubscriptionStatus(profile?.subscriptionStatus);
      if ((current === "TRIAL" || current === "ACTIVE") && user?.uid) {
        const { expired, wasTrial } = await checkAndExpireSubscription(user.uid);
        if (expired) {
          if (wasTrial) setTrialJustExpired(true);
          // Refetch profile to get updated status
          refetch();
        }
      }
    };
    checkExpiry();
  }, [profile?.subscriptionStatus, user?.uid, refetch]);

  useEffect(() => {
    if (!profile) {
      setStatus({
        isLocked: false,
        isExpired: false,
        isTrial: false,
        isTrialExpired: false,
        canPublish: false,
        trialDaysRemaining: 0,
        daysUntilExpiry: -1,
        profile: null,
        isLoading,
      });
      return;
    }

    // Use subscription data from provider profile, or fallback to users collection
    const subscriptionStatus = normalizeSubscriptionStatus(
      profile.subscriptionStatus || userSubscriptionData?.subscriptionStatus,
    );
    const subscriptionEndDate = profile.subscriptionEndDate || userSubscriptionData?.subscriptionEndDate;
    const accountStatus = profile.accountStatus || userSubscriptionData?.accountStatus;

    const isLocked = accountStatus === "LOCKED";
    const isTrial = subscriptionStatus === "TRIAL";

    // Parse the end date FIRST — it is the source of truth for whether a paid
    // period is still active. A fresh renewal sets a future date.
    const now = new Date();
    let daysUntilExpiry = -1;
    let endDate: Date | null = null;
    if (subscriptionEndDate) {
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
        (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
    }
    const hasFutureEnd = !!endDate && endDate.getTime() > now.getTime();

    // Expired only when the status says so AND no active paid period remains.
    // A future end date (just renewed) always wins over a stale status string —
    // this is what clears the banner immediately after renewal.
    const statusExpired =
      !subscriptionStatus ||
      subscriptionStatus === "EXPIRED" ||
      subscriptionStatus === "CANCELLED";
    const isExpired = statusExpired && !hasFutureEnd;

    // Check if trial just expired
    const isTrialExpired =
      trialJustExpired || (isExpired && profile.wasOnTrial === true);

    let trialDaysRemaining = 0;
    if (isTrial && daysUntilExpiry > 0) {
      trialDaysRemaining = daysUntilExpiry;
    }

    // Publishing requires a live period: not locked, not expired, still time left.
    const canPublish = !isLocked && !isExpired && daysUntilExpiry >= 0;

    setStatus({
      isLocked,
      isExpired,
      isTrial,
      isTrialExpired,
      canPublish,
      trialDaysRemaining,
      daysUntilExpiry,
      profile,
      isLoading,
    });
  }, [profile, isLoading, trialJustExpired, userSubscriptionData]);

  return status;
};
