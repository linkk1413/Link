import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  MessageCircle,
  Phone,
  User,
  XCircle,
  Star,
  Edit3,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  useBooking,
  useUpdateBookingStatus,
  useBookingTimelineLive,
} from "@/hooks/queries/useBookings";
import { useService } from "@/hooks/queries/useServices";
import { useProviderProfile } from "@/hooks/queries/useProviders";
import { useCreateChat } from "@/hooks/queries/useChats";
import { useReviewByBooking } from "@/hooks/queries/useReviews";
import { ReviewDialog } from "@/components/ReviewDialog";
import { StarRating } from "@/components/StarRating";
import { BookingStatus } from "@/types";
import { formatLocation } from "@/lib/saudiLocations";

const getStatusBadgeVariant = (status: BookingStatus) => {
  switch (status) {
    case "PENDING":
      return "secondary";
    case "ACCEPTED":
    case "CONFIRMED":
      return "default";
    case "IN_PROGRESS":
      return "default";
    case "COMPLETED":
      return "outline";
    case "CANCELLED_BY_CLIENT":
    case "CANCELLED_BY_PROVIDER":
    case "REJECTED":
      return "destructive";
    default:
      return "secondary";
  }
};

const BookingDetailsPage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isArabic = i18n.language === "ar";
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  const { data: booking, isLoading: loadingBooking } = useBooking(
    bookingId || "",
  );
  const { data: service, isLoading: loadingService } = useService(
    booking?.serviceId || "",
  );
  const { data: provider, isLoading: loadingProvider } = useProviderProfile(
    booking?.providerId || "",
  );
  const { data: existingReview, isLoading: loadingReview } = useReviewByBooking(
    bookingId || "",
  );

  const createChatMutation = useCreateChat();
  const updateStatusMutation = useUpdateBookingStatus();
  const { data: timeline = [] } = useBookingTimelineLive(bookingId || "");

  // Check if booking is completed and can be reviewed
  const isCompleted = booking?.status === "COMPLETED";
  const hasReview = !!existingReview;

  const handleBack = () => {
    navigate("/client/bookings");
  };

  const handleMessage = async () => {
    if (!user || !booking) return;

    try {
      const chatId = await createChatMutation.mutateAsync({
        clientId: user.uid,
        providerId: booking.providerId,
        clientName: user.displayName || user.email?.split("@")[0] || "",
        providerName: provider?.displayName || "",
        bookingId: booking.id,
      });
      navigate(`/client/chats/${chatId}`);
    } catch (error) {
      console.error("Failed to create chat:", error);
    }
  };

  const handleCancelBooking = async () => {
    if (!booking) return;

    try {
      await updateStatusMutation.mutateAsync({
        id: booking.id,
        status: "CANCELLED_BY_CLIENT",
        actorRole: "CLIENT",
      });
    } catch (error) {
      console.error("Failed to cancel booking:", error);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(isArabic ? "ar-SA" : "en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(date));
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat(isArabic ? "ar-SA" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const canCancel =
    booking && ["PENDING", "ACCEPTED", "CONFIRMED"].includes(booking.status);

  if (loadingBooking) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Skeleton className="h-8 w-32 mb-6" />
        <Skeleton className="h-48 w-full mb-4" />
        <Skeleton className="h-32 w-full mb-4" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-background p-4 flex flex-col items-center justify-center">
        <p className="text-muted-foreground mb-4">{t("bookings.notFound")}</p>
        <Button onClick={handleBack}>{t("common.back")}</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 p-4 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">{t("bookings.details")}</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <Badge variant={getStatusBadgeVariant(booking.status)}>
                  {t(`bookingStatus.${booking.status}`)}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  #{booking.id.slice(-6).toUpperCase()}
                </span>
              </div>

              {/* Service Info */}
              <div className="space-y-2">
                {loadingService ? (
                  <Skeleton className="h-7 w-48" />
                ) : (
                  <h2 className="text-xl font-semibold">
                    {service?.title || t("bookings.unknownService")}
                  </h2>
                )}
                <p className="text-2xl font-bold text-primary">
                  {booking.priceTotal} {t("common.currency")}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Date & Time Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("bookings.dateTime")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <span>{formatDate(booking.startAt)}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span>
                  {formatTime(booking.startAt)} - {formatTime(booking.endAt)}
                </span>
              </div>
              {booking.addressText && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <span>{booking.addressText}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Provider Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("bookings.provider")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  {loadingProvider ? (
                    <>
                      <Skeleton className="h-5 w-32 mb-1" />
                      <Skeleton className="h-4 w-24" />
                    </>
                  ) : (
                    <>
                      <p className="font-medium">
                        {provider?.displayName || t("bookings.provider")}
                      </p>
                      {(provider?.city || provider?.area) && (
                        <p className="text-sm text-muted-foreground">
                          {formatLocation(provider, isArabic)}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              <Separator className="my-4" />

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleMessage}
                  disabled={createChatMutation.isPending}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  {t("bookings.messageProvider")}
                </Button>
                {provider?.phone && (
                  <Button variant="outline" size="icon" asChild>
                    <a href={`tel:${provider.phone}`}>
                      <Phone className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Timeline */}
        {timeline.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="h-5 w-5 text-muted-foreground" />
                  {t("bookings.timeline")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {timeline.map((entry, index) => (
                    <div key={entry.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                        {index < timeline.length - 1 && (
                          <div className="w-px flex-1 bg-border" />
                        )}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm text-foreground">
                          {entry.type === "CREATED"
                            ? t("bookings.timelineCreated")
                            : t("bookings.timelineStatusChange", {
                                status: t(`bookingStatus.${entry.toStatus}`),
                              })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Intl.DateTimeFormat(isArabic ? "ar-SA" : "en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(entry.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Review Section - Only for completed bookings */}
        {isCompleted && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className={hasReview ? "border-primary/30 bg-primary/5" : ""}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  {t("review.yourReview")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingReview ? (
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ) : hasReview && existingReview ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <StarRating
                        rating={existingReview.rating}
                        size="md"
                        readOnly
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setReviewDialogOpen(true)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        {t("review.editReview")}
                      </Button>
                    </div>
                    {existingReview.comment && (
                      <p className="text-sm text-muted-foreground">
                        "{existingReview.comment}"
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(existingReview.createdAt).toLocaleDateString(
                        isArabic ? "ar-SA" : "en-US",
                        { year: "numeric", month: "long", day: "numeric" },
                      )}
                      {existingReview.updatedAt && (
                        <span> ({t("review.edited")})</span>
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-4">
                      {t("review.shareExperience")}
                    </p>
                    <Button onClick={() => setReviewDialogOpen(true)}>
                      <Star className="h-4 w-4 mr-2" />
                      {t("review.leaveReview")}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Cancel Booking */}
        {canCancel && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="w-full"
                  disabled={updateStatusMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {t("bookings.cancelBooking")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("bookings.cancelConfirmTitle")}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("bookings.cancelConfirmDesc")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancelBooking}>
                    {t("bookings.confirmCancel")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </motion.div>
        )}
      </div>

      {/* Review Dialog */}
      {booking && user && (
        <ReviewDialog
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          bookingId={booking.id}
          clientId={user.uid}
          clientName={
            user.displayName || user.name || user.email?.split("@")[0]
          }
          providerId={booking.providerId}
          serviceId={booking.serviceId}
          serviceName={service?.title}
          existingReview={existingReview}
        />
      )}
    </div>
  );
};

export default BookingDetailsPage;
