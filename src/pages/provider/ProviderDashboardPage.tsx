import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  CheckCircle,
  Plus,
  X,
  Check,
  MapPin,
  User,
  Gift,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HomeHeader } from "@/components/layout/HomeHeader";
import { BannerSlider } from "@/components/BannerSlider";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import {
  usePendingBookings,
  useProviderBookings,
  useUpdateBookingStatus,
} from "@/hooks/queries/useBookings";
import { useProviderBanner } from "@/hooks/queries/useBanner";
import { getPaymentByBooking } from "@/lib/firestore";
import { toast } from "@/components/ui/sonner";
import { Booking } from "@/types";

const ProviderDashboardPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, firebaseUser } = useAuth();
  const subscriptionStatus = useSubscriptionStatus();
  const { isLocked, isTrial, trialDaysRemaining, isExpired, profile } =
    subscriptionStatus;
  const navigate = useNavigate();
  const isArabic = i18n.language === "ar";

  // Fetch provider banner
  const { data: providerBanner } = useProviderBanner();

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [actionType, setActionType] = useState<"accept" | "reject" | null>(
    null,
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "upcoming">("pending");

  // Fetch pending bookings
  const { data: pendingBookings = [], isLoading } = usePendingBookings(
    user?.uid || "",
  );

  // Alert (toast + short beep) when a new booking request arrives while this
  // page is open — the 24h auto-reject window makes catching this fast worth
  // more than a silent badge. Skipped on first load (that's not "new").
  const knownPendingIds = useRef<Set<string> | null>(null);
  useEffect(() => {
    const currentIds = new Set(pendingBookings.map((b) => b.id));
    if (knownPendingIds.current === null) {
      knownPendingIds.current = currentIds;
      return;
    }
    const newOnes = pendingBookings.filter((b) => !knownPendingIds.current!.has(b.id));
    knownPendingIds.current = currentIds;
    if (newOnes.length === 0) return;

    newOnes.forEach((booking) => {
      toast.success(t("dashboard.newBookingAlert"), {
        description: booking.serviceName || undefined,
      });
    });

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.4);
    } catch (err) {
      // Audio isn't critical — the toast already carries the alert.
    }
  }, [pendingBookings, t]);

  // Fetch all bookings and filter for upcoming (accepted/confirmed)
  const { data: allBookings = [] } = useProviderBookings(user?.uid || "");
  const upcomingBookings = allBookings
    .filter(
      (b) =>
        (b.status === "ACCEPTED" || b.status === "CONFIRMED") &&
        new Date(b.startAt) >= new Date(),
    )
    .sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
    );

  // Confirmed appointments happening today, for the at-a-glance schedule card.
  const todaysBookings = allBookings
    .filter((b) => {
      if (!["ACCEPTED", "CONFIRMED", "IN_PROGRESS"].includes(b.status)) return false;
      const start = new Date(b.startAt);
      const now = new Date();
      return (
        start.getFullYear() === now.getFullYear() &&
        start.getMonth() === now.getMonth() &&
        start.getDate() === now.getDate()
      );
    })
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  const updateStatusMutation = useUpdateBookingStatus();

  const handleAction = (booking: Booking, action: "accept" | "reject") => {
    if (isLocked) {
      toast.error(t("provider.accountLockedTitle"), {
        description: t("provider.accountLockedMessage"),
      });
      return;
    }
    setSelectedBooking(booking);
    setActionType(action);
    setDialogOpen(true);
  };

  const apiBaseUrl =
    import.meta.env.VITE_MOYASAR_API_BASE_URL ||
    import.meta.env.VITE_PAYPAL_API_BASE_URL ||
    "";

  // Local guard so the money operation can't be double-submitted (the mutation's
  // isPending only covers the Firestore write, not the capture/void fetch).
  const [processingAction, setProcessingAction] = useState(false);

  const confirmAction = async () => {
    if (!selectedBooking || !actionType || processingAction) return;

    setProcessingAction(true);
    try {
      const payment = user
        ? await getPaymentByBooking(selectedBooking.id, user.uid)
        : null;
      const isMoyasar = payment?.gateway === "MOYASAR";
      const isHold = isMoyasar && payment?.status === "AUTHORIZED";
      const isCaptured = isMoyasar && payment?.status === "CAPTURED";

      // The server verifies this token identifies the provider on the
      // payment before it will capture/void/refund anything.
      const idToken = await firebaseUser?.getIdToken();
      const authHeaders: HeadersInit = idToken
        ? { Authorization: `Bearer ${idToken}` }
        : {};

      if (actionType === "accept") {
        // Immediate-capture payments are already charged — nothing to do.
        // If holds are ever enabled, capture the funds FIRST and only confirm
        // the booking if it succeeds. The server records status/captureId
        // itself after the real Moyasar capture succeeds.
        if (isHold && payment) {
          const res = await fetch(
            `${apiBaseUrl}/moyasar/capture/${payment.orderId}`,
            { method: "POST", headers: authHeaders },
          );
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "Failed to charge the client");
          }
        }
        await updateStatusMutation.mutateAsync({
          id: selectedBooking.id,
          status: "ACCEPTED",
          actorRole: "PROVIDER",
        });
      } else {
        // Reject: return the client's money, then mark the booking rejected.
        // Captured payments are refunded; a still-held payment is voided. The
        // server records the resulting status itself.
        await updateStatusMutation.mutateAsync({
          id: selectedBooking.id,
          status: "REJECTED",
          actorRole: "PROVIDER",
        });
        if ((isCaptured || isHold) && payment) {
          const endpoint = isCaptured ? "refund" : "void";
          try {
            const res = await fetch(
              `${apiBaseUrl}/moyasar/${endpoint}/${payment.orderId}`,
              { method: "POST", headers: authHeaders },
            );
            if (!res.ok) {
              console.error(`Moyasar ${endpoint} failed`, await res.text());
              toast.error(t("common.error"), {
                description: t("payment.paymentFailed"),
              });
            }
          } catch (refundError) {
            console.error(`Moyasar ${endpoint} error:`, refundError);
          }
        }
      }

      setDialogOpen(false);
      setSelectedBooking(null);
      setActionType(null);
    } catch (error) {
      console.error("Failed to update booking:", error);
      toast.error(t("common.error"), {
        description:
          error instanceof Error ? error.message : t("common.error"),
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(isArabic ? "ar-SA" : "en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString(isArabic ? "ar-SA" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Calculate stats from real data
  const todayBookings = pendingBookings.filter((b) => {
    const today = new Date();
    const bookingDate = new Date(b.startAt);
    return (
      bookingDate.getDate() === today.getDate() &&
      bookingDate.getMonth() === today.getMonth() &&
      bookingDate.getFullYear() === today.getFullYear()
    );
  });

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const stats = [
    {
      icon: <Calendar className="h-6 w-6" />,
      label: t("dashboard.bookingsToday"),
      value: todayBookings.length.toString(),
    },
    {
      icon: <Clock className="h-6 w-6" />,
      label: t("dashboard.pendingRequests"),
      value: pendingBookings.length.toString(),
    },
    {
      icon: <CheckCircle className="h-6 w-6" />,
      label: t("dashboard.completed"),
      value: "0",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <HomeHeader roleLabel="provider" />

      <main className="container py-6">
        {/* Provider Promotional Banner */}
        <BannerSlider
          slides={providerBanner?.slides}
          isActive={providerBanner?.isActive}
        />

        {/* Trial Banner */}
        {isTrial && trialDaysRemaining > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 p-4 border border-primary/20"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                <Gift className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">
                  {t("subscription.trialActive")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("subscription.trialDaysRemaining", {
                    days: trialDaysRemaining,
                  })}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => navigate("/provider/subscription")}
              >
                {t("subscription.subscribe")}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Trial Expiring Soon Warning */}
        {isTrial && trialDaysRemaining <= 3 && trialDaysRemaining > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-2xl bg-yellow-500/10 p-4 border border-yellow-500/20"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/20">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-700 dark:text-yellow-400">
                  {t("subscription.trialExpiringSoon")}
                </h3>
                <p className="text-sm text-yellow-600 dark:text-yellow-500">
                  {t("subscription.subscribeToKeepAccess")}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Subscription/Trial Expired Warning */}
        {isExpired && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-2xl bg-destructive/10 p-4 border border-destructive/20"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/20">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-destructive">
                  {subscriptionStatus.isTrialExpired
                    ? t("provider.trialExpiredTitle")
                    : t("provider.subscriptionExpiredTitle")}
                </h3>
                <p className="text-sm text-destructive/80">
                  {subscriptionStatus.isTrialExpired
                    ? t("provider.trialExpiredMessage")
                    : t("provider.subscriptionExpiredMessage")}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("provider.servicesHiddenMessage")}
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => navigate("/provider/subscription")}
              >
                {t("subscription.renewSubscription")}
              </Button>
            </div>
          </motion.div>
        )}

        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        >
          {/* Stats */}
          <motion.div
            variants={fadeInUp}
            className="mb-8 grid grid-cols-3 gap-4"
          >
            {stats.map((stat, index) => (
              <div
                key={index}
                className="flex flex-col items-center rounded-2xl bg-card p-4 text-center card-glow"
              >
                <div className="mb-2 text-primary">{stat.icon}</div>
                <p className="text-2xl font-bold text-card-foreground">
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Quick actions */}
          <motion.section variants={fadeInUp} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              {t("dashboard.quickActions")}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-24 flex-col gap-2 rounded-2xl"
                onClick={() => navigate("/provider/services")}
              >
                <Plus className="h-6 w-6" />
                {t("services.addService")}
              </Button>
              <Button
                variant="outline"
                className="h-24 flex-col gap-2 rounded-2xl"
                onClick={() => navigate("/provider/schedule")}
              >
                <Clock className="h-6 w-6" />
                {t("dashboard.setAvailability")}
              </Button>
            </div>
          </motion.section>

          {/* Today's Schedule */}
          {todaysBookings.length > 0 && (
            <motion.section variants={fadeInUp} className="mb-6">
              <h2 className="mb-3 font-medium text-foreground">
                {t("dashboard.todaysSchedule")}
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {todaysBookings.map((booking) => (
                  <button
                    key={booking.id}
                    onClick={() => navigate(`/provider/booking/${booking.id}`)}
                    className="flex min-w-[220px] shrink-0 flex-col gap-1 rounded-2xl bg-card p-4 text-start transition-colors hover:bg-accent"
                  >
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                      <Clock className="h-4 w-4" />
                      {new Date(booking.startAt).toLocaleTimeString(
                        isArabic ? "ar-SA" : "en-US",
                        { hour: "2-digit", minute: "2-digit" },
                      )}
                    </span>
                    <span className="truncate font-medium text-foreground">
                      {booking.serviceName || t("bookings.unknownService")}
                    </span>
                    <span className="truncate text-sm text-muted-foreground">
                      {booking.clientName}
                    </span>
                  </button>
                ))}
              </div>
            </motion.section>
          )}

          {/* Bookings Section with Tabs */}
          <motion.section variants={fadeInUp}>
            {/* Tab buttons */}
            <div className="mb-4 flex gap-2">
              <Button
                variant={activeTab === "pending" ? "default" : "outline"}
                className="flex-1 gap-2"
                onClick={() => setActiveTab("pending")}
              >
                {t("nav.requests")}
                {pendingBookings.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {pendingBookings.length}
                  </Badge>
                )}
              </Button>
              <Button
                variant={activeTab === "upcoming" ? "default" : "outline"}
                className="flex-1 gap-2"
                onClick={() => setActiveTab("upcoming")}
              >
                {t("dashboard.upcomingBookings")}
                {upcomingBookings.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {upcomingBookings.length}
                  </Badge>
                )}
              </Button>
            </div>

            {/* Pending Requests Tab */}
            {activeTab === "pending" && (
              <>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <Skeleton key={i} className="h-32 w-full rounded-2xl" />
                    ))}
                  </div>
                ) : pendingBookings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-12 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                      <Calendar className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">
                      {t("dashboard.noRequests")}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("dashboard.requestsWillAppear")}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingBookings.map((booking) => (
                      <div key={booking.id} className="rounded-2xl bg-card p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                <User className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-foreground">
                                  {booking.clientName || t("chat.client")}
                                </h3>
                                <Badge variant="outline">
                                  {t("booking.status.pending")}
                                </Badge>
                              </div>
                            </div>

                            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDate(booking.startAt)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span>{formatTime(booking.startAt)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span>
                                  {t(
                                    `services.${booking.locationType === "AT_PROVIDER" ? "atProvider" : "atClient"}`,
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="mt-4 flex gap-2">
                          <Button
                            className="flex-1 gap-2"
                            onClick={() => handleAction(booking, "accept")}
                          >
                            <Check className="h-4 w-4" />
                            {t("dashboard.accept")}
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1 gap-2"
                            onClick={() => handleAction(booking, "reject")}
                          >
                            <X className="h-4 w-4" />
                            {t("dashboard.reject")}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Upcoming Bookings Tab */}
            {activeTab === "upcoming" && (
              <>
                {upcomingBookings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-12 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                      <CheckCircle className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">
                      {t("dashboard.noUpcomingBookings")}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("dashboard.acceptedBookingsAppear")}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="rounded-2xl bg-card p-4 cursor-pointer hover:bg-card/80 transition-colors"
                        onClick={() =>
                          navigate(`/provider/booking/${booking.id}`)
                        }
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-foreground">
                                  {booking.clientName || t("chat.client")}
                                </h3>
                                <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                                  {t(`bookingStatus.${booking.status}`)}
                                </Badge>
                              </div>
                            </div>

                            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDate(booking.startAt)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span>{formatTime(booking.startAt)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span>
                                  {t(
                                    `services.${booking.locationType === "AT_PROVIDER" ? "atProvider" : "atClient"}`,
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </motion.section>
        </motion.div>
      </main>

      {/* Confirmation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "accept"
                ? t("dashboard.acceptTitle")
                : t("dashboard.rejectTitle")}
            </DialogTitle>
            <DialogDescription>
              {actionType === "accept"
                ? t("dashboard.acceptDescription")
                : t("dashboard.rejectDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant={actionType === "reject" ? "destructive" : "default"}
              onClick={confirmAction}
              disabled={updateStatusMutation.isPending || processingAction}
            >
              {actionType === "accept"
                ? t("dashboard.accept")
                : t("dashboard.reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProviderDashboardPage;
