import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Calendar, Clock, MapPin, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useClientBookings } from "@/hooks/queries/useBookings";
import { useServices } from "@/hooks/queries/useServices";
import { useVerifiedProviders } from "@/hooks/queries/useProviders";
import { Booking, BookingStatus } from "@/types";
import { formatLocation } from "@/lib/saudiLocations";

// Group bookings into categories
const categorizeBookings = (bookings: Booking[]) => {
  const now = new Date();
  const upcoming: Booking[] = [];
  const past: Booking[] = [];
  const cancelled: Booking[] = [];

  bookings.forEach((booking) => {
    if (
      booking.status === "CANCELLED_BY_CLIENT" ||
      booking.status === "CANCELLED_BY_PROVIDER" ||
      booking.status === "REJECTED"
    ) {
      cancelled.push(booking);
    } else if (
      booking.status === "COMPLETED" ||
      booking.status === "NO_SHOW" ||
      booking.status === "REFUNDED"
    ) {
      past.push(booking);
    } else {
      upcoming.push(booking);
    }
  });

  // Sort upcoming by date ascending, past by date descending
  upcoming.sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );
  past.sort(
    (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime(),
  );
  cancelled.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return { upcoming, past, cancelled };
};

// Status badge styling
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

const ClientBookingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isArabic = i18n.language === "ar";

  const [activeTab, setActiveTab] = useState("upcoming");

  // Fetch data
  const { data: bookings = [], isLoading: loadingBookings } = useClientBookings(
    user?.uid || "",
  );
  const { data: services = [] } = useServices();
  const { data: providers = [] } = useVerifiedProviders();

  // Create lookup maps
  const serviceMap = useMemo(() => {
    const map: Record<string, (typeof services)[0]> = {};
    services.forEach((s) => (map[s.id] = s));
    return map;
  }, [services]);

  const providerMap = useMemo(() => {
    const map: Record<string, (typeof providers)[0]> = {};
    providers.forEach((p) => (map[p.uid] = p));
    return map;
  }, [providers]);

  // Categorize bookings
  const { upcoming, past, cancelled } = useMemo(
    () => categorizeBookings(bookings),
    [bookings],
  );

  const getTabBookings = () => {
    switch (activeTab) {
      case "upcoming":
        return upcoming;
      case "past":
        return past;
      case "cancelled":
        return cancelled;
      default:
        return [];
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

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const renderBookingCard = (booking: Booking) => {
    const service = serviceMap[booking.serviceId];
    const provider = providerMap[booking.providerId];

    return (
      <motion.div
        key={booking.id}
        variants={fadeInUp}
        className="rounded-2xl bg-card p-4 transition-all hover:bg-accent cursor-pointer"
        onClick={() => navigate(`/client/bookings/${booking.id}`)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Service Title */}
            <h3 className="font-semibold text-foreground">
              {service?.title || t("bookings.unknownService")}
            </h3>

            {/* Provider */}
            <p className="mt-1 text-sm text-muted-foreground">
              {provider ? formatLocation(provider, isArabic) : ""}
            </p>

            {/* Date & Time */}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {formatDate(booking.startAt)}
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-4 w-4" />
                {formatTime(booking.startAt)}
              </span>
            </div>

            {/* Address */}
            {booking.addressText && (
              <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="truncate">{booking.addressText}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            {/* Status Badge */}
            <Badge variant={getStatusBadgeVariant(booking.status)}>
              {t(
                `booking.status.${booking.status.toLowerCase().replace(/_/g, "")}`,
              )}
            </Badge>

            {/* Price */}
            <span className="font-semibold text-primary">
              {booking.priceTotal} SAR
            </span>

            <ChevronRight className="h-5 w-5 text-muted-foreground rtl:rotate-180" />
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container py-4">
          <h1 className="text-xl font-semibold text-foreground">
            {t("nav.bookings")}
          </h1>
        </div>
      </header>

      <main className="container py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="upcoming" className="flex-1">
              {t("bookings.upcoming")} ({upcoming.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="flex-1">
              {t("bookings.past")} ({past.length})
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="flex-1">
              {t("bookings.cancelled")} ({cancelled.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {loadingBookings ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full rounded-2xl" />
                ))}
              </div>
            ) : getTabBookings().length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-12 text-center"
              >
                <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {activeTab === "upcoming"
                    ? t("bookings.noUpcoming")
                    : activeTab === "past"
                      ? t("bookings.noPast")
                      : t("bookings.noCancelled")}
                </p>
              </motion.div>
            ) : (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  visible: { transition: { staggerChildren: 0.05 } },
                }}
                className="space-y-4"
              >
                {getTabBookings().map(renderBookingCard)}
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ClientBookingsPage;
