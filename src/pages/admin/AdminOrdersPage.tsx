import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Search, ClipboardList } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAllBookings } from "@/hooks/queries/useBookings";
import { useUsers } from "@/hooks/queries/useUsers";
import { usePayments } from "@/hooks/queries/usePayments";
import { BookingStatus } from "@/types";

const STATUS_OPTIONS: BookingStatus[] = [
  "PENDING",
  "ACCEPTED",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED_BY_CLIENT",
  "CANCELLED_BY_PROVIDER",
  "REJECTED",
  "NO_SHOW",
  "REFUNDED",
  "DISPUTED",
];

const STATUS_BADGE_VARIANT: Record<
  BookingStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING: "secondary",
  ACCEPTED: "default",
  CONFIRMED: "default",
  IN_PROGRESS: "default",
  COMPLETED: "outline",
  CANCELLED_BY_CLIENT: "destructive",
  CANCELLED_BY_PROVIDER: "destructive",
  REJECTED: "destructive",
  NO_SHOW: "destructive",
  REFUNDED: "secondary",
  DISPUTED: "destructive",
};

const AdminOrdersPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "ALL">(
    "ALL",
  );

  const { data: bookings = [], isLoading } = useAllBookings();
  const { data: users = [] } = useUsers();
  const { data: payments = [] } = usePayments();

  const providerNameMap = useMemo(() => {
    return users.reduce<Record<string, string>>((acc, user) => {
      if (user.uid) {
        acc[user.uid] = user.displayName || user.name || user.email || "";
      }
      return acc;
    }, {});
  }, [users]);

  // Commission per order — only meaningful once platformFee is actually
  // computed at payment time (see finalizeMoyasarBooking.ts); older payments
  // will show 0.
  const commissionByBookingId = useMemo(() => {
    return payments.reduce<Record<string, number>>((acc, payment) => {
      if (payment.bookingId) {
        acc[payment.bookingId] = payment.platformFee || 0;
      }
      return acc;
    }, {});
  }, [payments]);

  const filteredBookings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return bookings.filter((booking) => {
      const providerName = providerNameMap[booking.providerId] || "";
      const matchesSearch =
        !q ||
        booking.clientName?.toLowerCase().includes(q) ||
        providerName.toLowerCase().includes(q) ||
        booking.id.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "ALL" || booking.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [bookings, searchQuery, statusFilter, providerNameMap]);

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString(isArabic ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-background">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
      >
        <motion.div variants={fadeInUp} className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            {t("admin.ordersManagement")}
          </h1>
          <p className="text-muted-foreground">
            {t("admin.ordersDescription")}
          </p>
        </motion.div>

        <motion.div
          variants={fadeInUp}
          className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("admin.searchOrders")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-10"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as BookingStatus | "ALL")
            }
          >
            <SelectTrigger className="sm:w-56">
              <SelectValue placeholder={t("admin.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("admin.allStatuses")}</SelectItem>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`bookingStatus.${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredBookings.length === 0 ? (
          <motion.div
            variants={fadeInUp}
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-12 text-center"
          >
            <ClipboardList className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">{t("admin.noOrders")}</p>
          </motion.div>
        ) : (
          <motion.div variants={fadeInUp} className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="p-3 text-start font-medium">{t("admin.orderId")}</th>
                  <th className="p-3 text-start font-medium">{t("admin.client")}</th>
                  <th className="p-3 text-start font-medium">{t("admin.provider")}</th>
                  <th className="p-3 text-start font-medium">{t("admin.service")}</th>
                  <th className="p-3 text-start font-medium">{t("admin.orderValue")}</th>
                  <th className="p-3 text-start font-medium">{t("admin.commission")}</th>
                  <th className="p-3 text-start font-medium">{t("admin.createdAt")}</th>
                  <th className="p-3 text-start font-medium">{t("admin.serviceDate")}</th>
                  <th className="p-3 text-start font-medium">{t("admin.status")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => (
                  <tr key={booking.id} className="border-t border-border hover:bg-accent/30">
                    <td className="p-3 font-mono text-xs text-muted-foreground">
                      #{booking.id.slice(0, 8)}
                    </td>
                    <td className="p-3">{booking.clientName || t("admin.notProvided")}</td>
                    <td className="p-3">
                      {providerNameMap[booking.providerId] || t("admin.notProvided")}
                    </td>
                    <td className="p-3">{booking.serviceName || t("admin.notProvided")}</td>
                    <td className="p-3 font-medium">{booking.priceTotal.toFixed(2)} SAR</td>
                    <td className="p-3 text-muted-foreground">
                      {(commissionByBookingId[booking.id] || 0).toFixed(2)} SAR
                    </td>
                    <td className="p-3 text-muted-foreground">{formatDate(booking.createdAt)}</td>
                    <td className="p-3 text-muted-foreground">
                      {booking.bookingDate || formatDate(booking.startAt)}
                    </td>
                    <td className="p-3">
                      <Badge variant={STATUS_BADGE_VARIANT[booking.status]}>
                        {t(`bookingStatus.${booking.status}`)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default AdminOrdersPage;
