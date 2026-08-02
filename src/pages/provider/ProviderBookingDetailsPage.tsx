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
  MessageSquare,
  Phone,
  User,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  useBooking,
  useUpdateBookingStatus,
} from "@/hooks/queries/useBookings";
import { useService } from "@/hooks/queries/useServices";
import { useCreateChat } from "@/hooks/queries/useChats";
import { useUser } from "@/hooks/queries/useUsers";
import { getWhatsappLink, getTelLink } from "@/lib/phone";
import { BookingStatus } from "@/types";

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

const ProviderBookingDetailsPage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isArabic = i18n.language === "ar";

  const [dialogType, setDialogType] = useState<"complete" | "cancel" | null>(
    null,
  );

  const { data: booking, isLoading: loadingBooking } = useBooking(
    bookingId || "",
  );
  const { data: service, isLoading: loadingService } = useService(
    booking?.serviceId || "",
  );
  const { data: client, isLoading: loadingClient } = useUser(
    booking?.clientId || "",
  );

  const createChatMutation = useCreateChat();
  const updateStatusMutation = useUpdateBookingStatus();

  const handleBack = () => {
    navigate("/provider");
  };

  const handleMessage = async () => {
    if (!user || !booking) return;

    try {
      const chatId = await createChatMutation.mutateAsync({
        clientId: booking.clientId,
        providerId: user.uid,
        clientName: client?.displayName || client?.name || "",
        providerName: user.displayName || user.email?.split("@")[0] || "",
        bookingId: booking.id,
      });
      navigate(`/provider/chats/${chatId}`);
    } catch (error) {
      console.error("Failed to create chat:", error);
    }
  };

  const handleStatusUpdate = async (status: BookingStatus) => {
    if (!booking) return;

    try {
      await updateStatusMutation.mutateAsync({
        id: booking.id,
        status,
        actorRole: "PROVIDER",
      });
      setDialogType(null);
    } catch (error) {
      console.error("Failed to update booking:", error);
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

  const canComplete =
    booking &&
    ["ACCEPTED", "CONFIRMED", "IN_PROGRESS"].includes(booking.status);
  const canCancel =
    booking && ["PENDING", "ACCEPTED", "CONFIRMED"].includes(booking.status);
  const canStartProgress =
    booking && ["ACCEPTED", "CONFIRMED"].includes(booking.status);

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
              {service?.locationType && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <span>
                    {t(
                      `services.${service.locationType === "AT_PROVIDER" ? "atProvider" : "atClient"}`,
                    )}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Client Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("chat.client")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  {loadingClient ? (
                    <Skeleton className="h-5 w-32" />
                  ) : (
                    <p className="font-medium">
                      {client?.name || t("chat.client")}
                    </p>
                  )}
                </div>
              </div>

              <Separator className="my-4" />

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-1.5"
                  onClick={handleMessage}
                  disabled={createChatMutation.isPending}
                >
                  <MessageSquare className="h-4 w-4" />
                  {t("bookings.messageClient")}
                </Button>
                {client?.phone && (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1 gap-1.5 border-green-600/40 text-green-600 hover:bg-green-600/10 hover:text-green-600"
                      asChild
                    >
                      <a
                        href={getWhatsappLink(client.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="h-4 w-4" />
                        {t("bookings.whatsappClient")}
                      </a>
                    </Button>
                    <Button variant="outline" className="flex-1 gap-1.5" asChild>
                      <a href={getTelLink(client.phone)}>
                        <Phone className="h-4 w-4" />
                        {t("bookings.callClient")}
                      </a>
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Status Actions */}
        {(canStartProgress || canComplete) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            {canStartProgress && booking.status !== "IN_PROGRESS" && (
              <Button
                className="w-full"
                variant="outline"
                onClick={() => handleStatusUpdate("IN_PROGRESS")}
                disabled={updateStatusMutation.isPending}
              >
                <Clock className="h-4 w-4 mr-2" />
                {t("bookings.startProgress")}
              </Button>
            )}

            <Button
              className="w-full"
              onClick={() => setDialogType("complete")}
              disabled={updateStatusMutation.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {t("bookings.markComplete")}
            </Button>
          </motion.div>
        )}

        {/* Cancel Booking */}
        {canCancel && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setDialogType("cancel")}
              disabled={updateStatusMutation.isPending}
            >
              <XCircle className="h-4 w-4 mr-2" />
              {t("bookings.cancelBooking")}
            </Button>
          </motion.div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog
        open={dialogType !== null}
        onOpenChange={() => setDialogType(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogType === "complete"
                ? t("bookings.completeConfirmTitle")
                : t("bookings.cancelConfirmTitle")}
            </DialogTitle>
            <DialogDescription>
              {dialogType === "complete"
                ? t("bookings.completeConfirmDesc")
                : t("bookings.cancelConfirmDescProvider")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogType(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant={dialogType === "cancel" ? "destructive" : "default"}
              onClick={() =>
                handleStatusUpdate(
                  dialogType === "complete"
                    ? "COMPLETED"
                    : "CANCELLED_BY_PROVIDER",
                )
              }
              disabled={updateStatusMutation.isPending}
            >
              {dialogType === "complete"
                ? t("bookings.confirmComplete")
                : t("bookings.confirmCancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProviderBookingDetailsPage;
